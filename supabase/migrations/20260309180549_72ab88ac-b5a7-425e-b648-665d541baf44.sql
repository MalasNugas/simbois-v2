
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('klien', 'pegawai');

-- Create enum for employment status
CREATE TYPE public.employment_status AS ENUM ('belum_bekerja', 'sedang_pelatihan', 'sudah_bekerja');

-- Create enum for guidance status
CREATE TYPE public.guidance_status AS ENUM ('aktif', 'selesai', 'tidak_aktif');

-- Create enum for registration status
CREATE TYPE public.registration_status AS ENUM ('pending', 'approved', 'rejected');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Clients table (extended info for klien role)
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  case_number TEXT,
  guidance_status guidance_status DEFAULT 'aktif',
  employment_status employment_status DEFAULT 'belum_bekerja',
  employment_details TEXT,
  training_needs TEXT,
  assigned_pk_id UUID REFERENCES auth.users(id),
  referred_to_disnaker BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Programs table
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  program_type TEXT NOT NULL CHECK (program_type IN ('kepribadian', 'kemandirian')),
  schedule_date TIMESTAMPTZ,
  schedule_end TIMESTAMPTZ,
  quota INTEGER DEFAULT 0,
  trainer_name TEXT,
  trainer_info TEXT,
  is_open BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Program registrations
CREATE TABLE public.program_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status registration_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(program_id, client_id)
);
ALTER TABLE public.program_registrations ENABLE ROW LEVEL SECURITY;

-- Location tracking
CREATE TABLE public.location_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  tracked_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.location_tracking ENABLE ROW LEVEL SECURITY;

-- Create index for location queries
CREATE INDEX idx_location_tracking_user_id ON public.location_tracking(user_id);
CREATE INDEX idx_location_tracking_tracked_at ON public.location_tracking(tracked_at DESC);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_programs_updated_at BEFORE UPDATE ON public.programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for location_tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_tracking;

-- RLS Policies

-- user_roles: users can read their own roles
CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pegawai can read all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'pegawai'));

-- profiles
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pegawai can read all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'pegawai'));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- clients
CREATE POLICY "Clients can read own data" ON public.clients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pegawai can read all clients" ON public.clients FOR SELECT USING (public.has_role(auth.uid(), 'pegawai'));
CREATE POLICY "Pegawai can update clients" ON public.clients FOR UPDATE USING (public.has_role(auth.uid(), 'pegawai'));
CREATE POLICY "Users can insert own client data" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own client data" ON public.clients FOR UPDATE USING (auth.uid() = user_id);

-- programs
CREATE POLICY "Anyone authenticated can view open programs" ON public.programs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pegawai can manage programs" ON public.programs FOR ALL USING (public.has_role(auth.uid(), 'pegawai'));

-- program_registrations
CREATE POLICY "Clients can view own registrations" ON public.program_registrations FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Clients can register" ON public.program_registrations FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Pegawai can view all registrations" ON public.program_registrations FOR SELECT USING (public.has_role(auth.uid(), 'pegawai'));
CREATE POLICY "Pegawai can update registrations" ON public.program_registrations FOR UPDATE USING (public.has_role(auth.uid(), 'pegawai'));

-- location_tracking
CREATE POLICY "Users can insert own location" ON public.location_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own location" ON public.location_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Pegawai can view all locations" ON public.location_tracking FOR SELECT USING (public.has_role(auth.uid(), 'pegawai'));
