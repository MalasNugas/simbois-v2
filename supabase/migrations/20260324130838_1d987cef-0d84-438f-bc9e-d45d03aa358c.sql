
CREATE TABLE public.termination_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  pegawai_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.termination_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pegawai can insert termination reports"
  ON public.termination_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = pegawai_id AND has_role(auth.uid(), 'pegawai'));

CREATE POLICY "Pegawai can view termination reports"
  ON public.termination_reports FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'pegawai'));

CREATE POLICY "Admin can view termination reports"
  ON public.termination_reports FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
