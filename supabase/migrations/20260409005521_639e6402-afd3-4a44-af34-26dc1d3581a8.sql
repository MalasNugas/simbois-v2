
-- Allow pegawai to update their own termination reports
CREATE POLICY "Pegawai can update own termination reports"
ON public.termination_reports
FOR UPDATE
TO authenticated
USING (auth.uid() = pegawai_id AND has_role(auth.uid(), 'pegawai'::app_role))
WITH CHECK (auth.uid() = pegawai_id AND has_role(auth.uid(), 'pegawai'::app_role));

-- Allow pegawai to delete their own termination reports
CREATE POLICY "Pegawai can delete own termination reports"
ON public.termination_reports
FOR DELETE
TO authenticated
USING (auth.uid() = pegawai_id AND has_role(auth.uid(), 'pegawai'::app_role));
