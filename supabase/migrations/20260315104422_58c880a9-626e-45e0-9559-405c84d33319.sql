
-- Table for monthly attendance/wajib lapor records
CREATE TABLE public.monthly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_month integer NOT NULL,
  report_year integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(client_id, report_month, report_year)
);

ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- Clients can insert their own reports
CREATE POLICY "Clients can insert own reports"
ON public.monthly_reports FOR INSERT TO authenticated
WITH CHECK (auth.uid() = client_id);

-- Clients can view own reports
CREATE POLICY "Clients can view own reports"
ON public.monthly_reports FOR SELECT TO authenticated
USING (auth.uid() = client_id);

-- Pegawai can view all reports
CREATE POLICY "Pegawai can view all reports"
ON public.monthly_reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'pegawai'));

-- Add guidance period columns to clients
ALTER TABLE public.clients
ADD COLUMN guidance_start date,
ADD COLUMN guidance_end date;
