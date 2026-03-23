
-- Insert missing profile for existing pegawai user
INSERT INTO public.profiles (user_id, full_name)
VALUES ('e53b1544-0fee-4eef-9dc3-ef0039bdd6eb', 'Budi Santoso PK')
ON CONFLICT (user_id) DO NOTHING;

-- Also insert missing profile for klien user if not exists
INSERT INTO public.profiles (user_id, full_name)
VALUES ('7611d3b3-10c4-41b1-8220-5b86f95df267', 'Ahmad Rizki')
ON CONFLICT (user_id) DO NOTHING;

-- Attach the handle_new_user trigger so future signups auto-create profiles
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
