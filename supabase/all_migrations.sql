
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.unit_system AS ENUM ('metric', 'imperial');

-- Timestamp helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  units public.unit_system NOT NULL DEFAULT 'metric',
  home_lat DOUBLE PRECISION,
  home_lon DOUBLE PRECISION,
  home_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Admin-only role management
CREATE POLICY "admins manage roles insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Favourite locations
CREATE TABLE public.favourite_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX favourite_locations_user_idx ON public.favourite_locations(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favourite_locations TO authenticated;
GRANT ALL ON public.favourite_locations TO service_role;
ALTER TABLE public.favourite_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favs all" ON public.favourite_locations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Widget configs
CREATE TABLE public.widget_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  x INT NOT NULL DEFAULT 0,
  y INT NOT NULL DEFAULT 0,
  w INT NOT NULL DEFAULT 4,
  h INT NOT NULL DEFAULT 4,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX widget_configs_user_idx ON public.widget_configs(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.widget_configs TO authenticated;
GRANT ALL ON public.widget_configs TO service_role;
ALTER TABLE public.widget_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own widgets all" ON public.widget_configs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER widget_configs_updated_at BEFORE UPDATE ON public.widget_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO authenticated, service_role;

CREATE TABLE public.alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL,
  comparator TEXT NOT NULL CHECK (comparator IN ('gt','lt')),
  threshold DOUBLE PRECISION NOT NULL,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_value DOUBLE PRECISION,
  last_triggered_at TIMESTAMPTZ,
  last_checked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alerts all" ON public.alerts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER alerts_set_updated_at BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TABLE public.briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.briefings TO authenticated;
GRANT ALL ON public.briefings TO service_role;
ALTER TABLE public.briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own briefings all" ON public.briefings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX briefings_user_created_idx ON public.briefings (user_id, created_at DESC);
-- =========================================================
-- OMNISPHERE 2.0 SCHEMA
-- =========================================================

-- ---------- AUTOMATIONS ----------
CREATE TABLE public.automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  trigger_kind text NOT NULL,
  trigger_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_kind text NOT NULL,
  action_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_ran_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.automations TO authenticated;
GRANT ALL ON public.automations TO service_role;
ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own automations" ON public.automations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id uuid NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.automation_runs TO authenticated;
GRANT ALL ON public.automation_runs TO service_role;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own automation runs read" ON public.automation_runs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own automation runs insert" ON public.automation_runs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ---------- JOURNAL ----------
CREATE TABLE public.journal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.journal TO authenticated;
GRANT ALL ON public.journal TO service_role;
ALTER TABLE public.journal ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal" ON public.journal FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- AGENTS ----------
CREATE TABLE public.agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  system_prompt text NOT NULL,
  tools text[] NOT NULL DEFAULT ARRAY[]::text[],
  model text NOT NULL DEFAULT 'google/gemini-3.6-flash',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agents TO authenticated;
GRANT ALL ON public.agents TO service_role;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agents" ON public.agents FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  input text NOT NULL,
  output text,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.agent_runs TO authenticated;
GRANT ALL ON public.agent_runs TO service_role;
ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own agent runs" ON public.agent_runs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- DEVICES ----------
CREATE TABLE public.devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  device_key text NOT NULL UNIQUE,
  hmac_secret text NOT NULL,
  metric text NOT NULL DEFAULT 'value',
  unit text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.devices TO authenticated;
GRANT ALL ON public.devices TO service_role;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own devices" ON public.devices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.device_readings (
  id bigserial PRIMARY KEY,
  device_id uuid NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  value double precision NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX device_readings_device_time ON public.device_readings(device_id, recorded_at DESC);
GRANT SELECT, INSERT ON public.device_readings TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.device_readings_id_seq TO authenticated;
GRANT ALL ON public.device_readings TO service_role;
ALTER TABLE public.device_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own device readings" ON public.device_readings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- SHARED DASHBOARDS ----------
CREATE TABLE public.shared_dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.shared_dashboards TO anon;
GRANT SELECT, INSERT, DELETE ON public.shared_dashboards TO authenticated;
GRANT ALL ON public.shared_dashboards TO service_role;
ALTER TABLE public.shared_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read shares" ON public.shared_dashboards FOR SELECT TO anon USING (true);
CREATE POLICY "own shares read" ON public.shared_dashboards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "own shares write" ON public.shared_dashboards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own shares delete" ON public.shared_dashboards FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- ACHIEVEMENTS ----------
CREATE TABLE public.achievements (
  code text PRIMARY KEY,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy'
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read achievements" ON public.achievements FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.user_achievements (
  user_id uuid NOT NULL,
  code text NOT NULL REFERENCES public.achievements(code) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, code)
);
GRANT SELECT, INSERT ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own unlocks" ON public.user_achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.achievements (code, title, description, icon) VALUES
  ('first_widget',    'Command Online',   'Added your first widget',            'layout-dashboard'),
  ('first_alert',     'Sentinel',         'Created your first alert',           'bell'),
  ('first_briefing',  'Situational',      'Generated your first AI briefing',   'sparkles'),
  ('first_automation','Autopilot',        'Created your first automation',      'zap'),
  ('first_agent',     'Delegator',        'Created your first custom agent',    'bot'),
  ('first_device',    'Grid Connected',   'Registered your first IoT device',   'cpu'),
  ('first_share',     'Broadcaster',      'Shared your first dashboard',        'share-2'),
  ('preset_installed','Vertical Adept',   'Installed a vertical preset',        'sparkles');

-- ---------- PROVIDER CACHE ----------
CREATE TABLE public.provider_cache (
  cache_key text PRIMARY KEY,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.provider_cache TO service_role;
ALTER TABLE public.provider_cache ENABLE ROW LEVEL SECURITY;
-- No policies: server-only via service role.

-- ---------- CLIENT ERRORS ----------
CREATE TABLE public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  message text NOT NULL,
  stack text,
  url text,
  ua text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.client_errors TO anon, authenticated;
GRANT ALL ON public.client_errors TO service_role;
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can log errors" ON public.client_errors FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ---------- Triggers for updated_at ----------
CREATE TRIGGER set_automations_updated_at BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_agents_updated_at BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------- pg_cron for automations ----------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'run-automations-every-5-min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--05418edc-7e21-4d8b-889f-b1ef1dc7ce64.lovable.app/api/public/hooks/run-automations',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_QqAAxDaiu8IFJT36LOFd5Q_nf5Md6gA'
    ),
    body := '{}'::jsonb
  );
  $$
);

CREATE TABLE public.personal_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  occurred_at date NOT NULL,
  kind text NOT NULL DEFAULT 'other',
  lat double precision,
  lon double precision,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.personal_milestones TO authenticated;
GRANT ALL ON public.personal_milestones TO service_role;

ALTER TABLE public.personal_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own milestones"
  ON public.personal_milestones FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER milestones_set_updated_at
  BEFORE UPDATE ON public.personal_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX personal_milestones_user_date_idx ON public.personal_milestones (user_id, occurred_at);

-- Oracle threads
CREATE TABLE public.oracle_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oracle_threads TO authenticated;
GRANT ALL ON public.oracle_threads TO service_role;
ALTER TABLE public.oracle_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_threads" ON public.oracle_threads FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER oracle_threads_updated_at BEFORE UPDATE ON public.oracle_threads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Oracle messages
CREATE TABLE public.oracle_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.oracle_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  graph JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX oracle_messages_thread_idx ON public.oracle_messages(thread_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.oracle_messages TO authenticated;
GRANT ALL ON public.oracle_messages TO service_role;
ALTER TABLE public.oracle_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_messages" ON public.oracle_messages FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Calendar events (manual entries powering Day Compass)
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX calendar_events_user_time_idx ON public.calendar_events(user_id, starts_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_events" ON public.calendar_events FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER calendar_events_updated_at BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
CREATE TABLE IF NOT EXISTS public.pulses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  pulse jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pulses_user_created_idx ON public.pulses(user_id, created_at DESC);
GRANT SELECT, INSERT, DELETE ON public.pulses TO authenticated;
GRANT ALL ON public.pulses TO service_role;
ALTER TABLE public.pulses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pulses_owner_select" ON public.pulses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "pulses_owner_insert" ON public.pulses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "pulses_owner_delete" ON public.pulses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL,
  claim text NOT NULL,
  category text NOT NULL,
  probability numeric NOT NULL CHECK (probability >= 0 AND probability <= 1),
  horizon text NOT NULL,
  reasoning text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  outcome boolean,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS predictions_user_created_idx ON public.predictions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS predictions_batch_idx ON public.predictions(batch_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.predictions TO authenticated;
GRANT ALL ON public.predictions TO service_role;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "predictions_owner_all" ON public.predictions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);