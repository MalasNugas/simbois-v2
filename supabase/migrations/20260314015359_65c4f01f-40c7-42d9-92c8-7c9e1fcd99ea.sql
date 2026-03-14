
-- Add client_status column to clients table
ALTER TABLE public.clients ADD COLUMN client_status text DEFAULT 'aktif';

-- Create function to get pegawai list for client PK selection
CREATE OR REPLACE FUNCTION public.get_pegawai_list()
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.full_name
  FROM public.profiles p
  INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role = 'pegawai'
  ORDER BY p.full_name;
$$;
