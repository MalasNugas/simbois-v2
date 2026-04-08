-- Add birth_date to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date date;

-- Add approval_status to termination_reports
ALTER TABLE public.termination_reports ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending';

-- Create storage bucket for client avatars
INSERT INTO storage.buckets (id, name, public) VALUES ('client-avatars', 'client-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for client-avatars
CREATE POLICY "Anyone can view client avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-avatars');

CREATE POLICY "Authenticated users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'client-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin can update termination_reports (for approval)
CREATE POLICY "Admin can update termination reports"
ON public.termination_reports FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));