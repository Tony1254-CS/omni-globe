
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
