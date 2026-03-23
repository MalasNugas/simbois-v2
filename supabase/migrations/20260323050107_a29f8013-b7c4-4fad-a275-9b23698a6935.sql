
-- Fix overly permissive insert policy on notifications
DROP POLICY "Authenticated can insert notifications" ON public.notifications;

-- Only allow users to insert notifications for others (system-level, pegawai can notify clients)
CREATE POLICY "Pegawai can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'pegawai') OR auth.uid() = user_id);
