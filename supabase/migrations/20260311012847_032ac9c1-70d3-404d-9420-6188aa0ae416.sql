-- Allow clients to read profile of their assigned PK
CREATE POLICY "Clients can read assigned PK profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients
    WHERE clients.user_id = auth.uid()
      AND clients.assigned_pk_id = profiles.user_id
  )
);

-- Allow pegawai to delete programs they created
CREATE POLICY "Pegawai can delete programs"
ON public.programs
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'pegawai'::app_role));

-- Allow pegawai to update profiles (for verification)
CREATE POLICY "Pegawai can update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'pegawai'::app_role));