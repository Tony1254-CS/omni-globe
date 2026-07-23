
DROP POLICY IF EXISTS "public read shares" ON public.shared_dashboards;

CREATE OR REPLACE FUNCTION public.get_shared_dashboard(_slug text)
RETURNS TABLE(title text, snapshot jsonb, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT title, snapshot, created_at
  FROM public.shared_dashboards
  WHERE slug = _slug
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_shared_dashboard(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_dashboard(text) TO anon, authenticated, service_role;

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY IF EXISTS "admins manage roles delete" ON public.user_roles;
DROP POLICY IF EXISTS "admins manage roles insert" ON public.user_roles;
CREATE POLICY "admins manage roles delete" ON public.user_roles
FOR DELETE TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "admins manage roles insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

DROP POLICY IF EXISTS "anyone can log errors" ON public.client_errors;
CREATE POLICY "authenticated users log own errors" ON public.client_errors
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
