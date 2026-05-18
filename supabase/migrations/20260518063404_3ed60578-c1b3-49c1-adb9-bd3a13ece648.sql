-- Function to notify all clients about a new open program
CREATE OR REPLACE FUNCTION public.notify_clients_new_program()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT ur.user_id,
         'Program Baru Tersedia',
         NEW.name || ' telah dibuka untuk pendaftaran. Segera daftar!',
         'info'
  FROM public.user_roles ur
  WHERE ur.role = 'klien';
  RETURN NEW;
END;
$$;

-- Trigger on INSERT when program is open
DROP TRIGGER IF EXISTS trg_notify_clients_program_insert ON public.programs;
CREATE TRIGGER trg_notify_clients_program_insert
AFTER INSERT ON public.programs
FOR EACH ROW
WHEN (NEW.is_open = true)
EXECUTE FUNCTION public.notify_clients_new_program();

-- Trigger on UPDATE when program transitions to open
DROP TRIGGER IF EXISTS trg_notify_clients_program_update ON public.programs;
CREATE TRIGGER trg_notify_clients_program_update
AFTER UPDATE ON public.programs
FOR EACH ROW
WHEN (OLD.is_open IS DISTINCT FROM NEW.is_open AND NEW.is_open = true)
EXECUTE FUNCTION public.notify_clients_new_program();

-- Ensure notifications table is in realtime publication
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END $$;