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