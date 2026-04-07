
ALTER TABLE public.termination_reports ADD COLUMN file_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('termination-files', 'termination-files', true);

CREATE POLICY "Public can read termination files"
ON storage.objects FOR SELECT
USING (bucket_id = 'termination-files');

CREATE POLICY "Authenticated users can upload termination files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'termination-files');
