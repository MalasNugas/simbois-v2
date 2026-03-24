
-- Admin can read all clients
CREATE POLICY "Admin can read all clients"
ON public.clients FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can read all profiles
CREATE POLICY "Admin can read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin can read all roles
CREATE POLICY "Admin can read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
