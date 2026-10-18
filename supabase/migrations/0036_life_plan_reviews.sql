-- Plan de transformación y revisión semanal (sobre 0035_life_map).
-- life_maps.plan: visión → por área de enfoque: meta a 90 días, identidad, hábito clave e hitos; y el foco de la semana.
-- life_reviews: una revisión por semana (lunes local de la semana revisada): qué funcionó, qué aprendió y su foco siguiente.

ALTER TABLE public.life_maps ADD COLUMN IF NOT EXISTS plan JSONB CHECK (plan IS NULL OR jsonb_typeof(plan) = 'object');
ALTER TABLE public.life_maps ADD COLUMN IF NOT EXISTS plan_updated_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.life_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  wins TEXT CHECK (wins IS NULL OR char_length(wins) <= 600),
  lesson TEXT CHECK (lesson IS NULL OR char_length(lesson) <= 600),
  next_area TEXT,
  one_thing TEXT CHECK (one_thing IS NULL OR char_length(one_thing) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_life_reviews_user ON public.life_reviews (user_id, week_start DESC);

ALTER TABLE public.life_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lr_own" ON public.life_reviews;
CREATE POLICY "lr_own" ON public.life_reviews FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
