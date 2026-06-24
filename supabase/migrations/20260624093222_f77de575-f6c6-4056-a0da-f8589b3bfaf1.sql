
-- ============================================================
-- REFACTOR SIMBOIS: Drop fitur lama, tambah sistem Wajib Lapor
-- ============================================================

-- 1. DROP fitur lama (Surat, Program, Chat, dan turunannya)
DROP TRIGGER IF EXISTS trg_notify_clients_program_insert ON public.programs;
DROP TRIGGER IF EXISTS trg_notify_clients_program_update ON public.programs;
DROP FUNCTION IF EXISTS public.notify_clients_new_program() CASCADE;

DROP TABLE IF EXISTS public.program_registrations CASCADE;
DROP TABLE IF EXISTS public.programs CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.termination_reports CASCADE;

-- 2. ALTER monthly_reports: tambah field selfie, lokasi, izin
ALTER TABLE public.monthly_reports
  ADD COLUMN IF NOT EXISTS selfie_url text,
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS permission_id uuid,
  ADD COLUMN IF NOT EXISTS submitted_via text DEFAULT 'public_form',
  ADD COLUMN IF NOT EXISTS job_status text,
  ADD COLUMN IF NOT EXISTS operational_status text;

-- Unique: 1 laporan per client per bulan
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'monthly_reports_client_period_uniq'
  ) THEN
    ALTER TABLE public.monthly_reports
      ADD CONSTRAINT monthly_reports_client_period_uniq
      UNIQUE (client_id, report_year, report_month);
  END IF;
END $$;

-- 3. Tabel reporting_permissions
CREATE TABLE IF NOT EXISTS public.reporting_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  pegawai_id uuid NOT NULL,
  period_year int NOT NULL,
  period_month int NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  note text,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, period_year, period_month)
);

GRANT SELECT ON public.reporting_permissions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reporting_permissions TO authenticated;
GRANT ALL ON public.reporting_permissions TO service_role;

ALTER TABLE public.reporting_permissions ENABLE ROW LEVEL SECURITY;

-- Admin full
CREATE POLICY "rp_admin_all" ON public.reporting_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Pegawai: kelola izin untuk client binaannya
CREATE POLICY "rp_pegawai_select" ON public.reporting_permissions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'pegawai') AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.assigned_pk_id = auth.uid())
  );

CREATE POLICY "rp_pegawai_insert" ON public.reporting_permissions
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'pegawai') AND
    pegawai_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.assigned_pk_id = auth.uid())
  );

CREATE POLICY "rp_pegawai_update" ON public.reporting_permissions
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'pegawai') AND
    EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.assigned_pk_id = auth.uid())
  );

-- Anon: hanya read untuk validasi (akan diperketat via function)
CREATE POLICY "rp_anon_select_active" ON public.reporting_permissions
  FOR SELECT TO anon
  USING (revoked_at IS NULL AND used_at IS NULL);

-- Trigger updated_at
CREATE TRIGGER trg_rp_updated_at
  BEFORE UPDATE ON public.reporting_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. RPC publik untuk search client (tanpa expose data sensitif)
CREATE OR REPLACE FUNCTION public.search_clients_public(_q text)
RETURNS TABLE(id uuid, full_name text, case_number text, assigned_pk_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, p.full_name, c.case_number, pk.full_name AS assigned_pk_name
  FROM public.clients c
  JOIN public.profiles p ON p.user_id = c.user_id
  LEFT JOIN public.profiles pk ON pk.user_id = c.assigned_pk_id
  WHERE _q IS NOT NULL AND length(_q) >= 2
    AND (p.full_name ILIKE '%' || _q || '%' OR c.case_number ILIKE '%' || _q || '%')
  ORDER BY p.full_name
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.search_clients_public(text) TO anon, authenticated;

-- 5. RPC publik: status izin client bulan berjalan
CREATE OR REPLACE FUNCTION public.get_client_permission_status(_client_id uuid)
RETURNS TABLE(
  client_id uuid,
  full_name text,
  case_number text,
  assigned_pk_name text,
  has_permission boolean,
  already_reported boolean,
  period_year int,
  period_month int,
  permission_id uuid
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM now())::int;
  v_month int := EXTRACT(MONTH FROM now())::int;
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    p.full_name,
    c.case_number,
    pk.full_name,
    EXISTS (
      SELECT 1 FROM public.reporting_permissions rp
      WHERE rp.client_id = c.id
        AND rp.period_year = v_year AND rp.period_month = v_month
        AND rp.revoked_at IS NULL
    ),
    EXISTS (
      SELECT 1 FROM public.monthly_reports mr
      WHERE mr.client_id = c.id
        AND mr.report_year = v_year AND mr.report_month = v_month
    ),
    v_year,
    v_month,
    (SELECT rp.id FROM public.reporting_permissions rp
     WHERE rp.client_id = c.id AND rp.period_year = v_year AND rp.period_month = v_month
       AND rp.revoked_at IS NULL LIMIT 1)
  FROM public.clients c
  JOIN public.profiles p ON p.user_id = c.user_id
  LEFT JOIN public.profiles pk ON pk.user_id = c.assigned_pk_id
  WHERE c.id = _client_id;
END $$;

GRANT EXECUTE ON FUNCTION public.get_client_permission_status(uuid) TO anon, authenticated;

-- 6. List pegawai (untuk dashboard admin)
CREATE OR REPLACE FUNCTION public.has_role_any(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role::text FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.has_role_any(uuid) TO authenticated;
