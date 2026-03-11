
-- Add gender column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender text;

-- Create storage bucket for program files
INSERT INTO storage.buckets (id, name, public) VALUES ('program-files', 'program-files', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to program-files bucket
CREATE POLICY "Pegawai can upload program files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'program-files' AND public.has_role(auth.uid(), 'pegawai'::app_role));

-- Allow anyone authenticated to read program files
CREATE POLICY "Authenticated can read program files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'program-files');

-- Allow pegawai to delete program files
CREATE POLICY "Pegawai can delete program files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'program-files' AND public.has_role(auth.uid(), 'pegawai'::app_role));

-- Add file_url column to programs table for PDF attachment
ALTER TABLE public.programs ADD COLUMN IF NOT EXISTS file_url text;
