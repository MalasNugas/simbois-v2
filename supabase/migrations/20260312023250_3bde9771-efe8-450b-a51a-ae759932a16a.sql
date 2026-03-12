
CREATE POLICY "Authenticated users can upload program files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'program-files');

CREATE POLICY "Authenticated users can read program files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'program-files');

CREATE POLICY "Pegawai can update program files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'program-files');
