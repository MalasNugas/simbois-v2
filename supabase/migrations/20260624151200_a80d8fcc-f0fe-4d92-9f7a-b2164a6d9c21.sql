
CREATE TABLE public.sheet_integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spreadsheet_id text NOT NULL,
  spreadsheet_url text,
  clients_sheet_name text NOT NULL DEFAULT 'Clients',
  reports_sheet_name text NOT NULL DEFAULT 'WajibLapor',
  permissions_sheet_name text NOT NULL DEFAULT 'Permissions',
  column_mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_sync boolean NOT NULL DEFAULT false,
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheet_integration_settings TO authenticated;
GRANT ALL ON public.sheet_integration_settings TO service_role;

ALTER TABLE public.sheet_integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read sheet settings"
  ON public.sheet_integration_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert sheet settings"
  ON public.sheet_integration_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update sheet settings"
  ON public.sheet_integration_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete sheet settings"
  ON public.sheet_integration_settings FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_sheet_integration_settings_updated_at
  BEFORE UPDATE ON public.sheet_integration_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
