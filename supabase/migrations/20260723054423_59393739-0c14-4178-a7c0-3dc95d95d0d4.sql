
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
