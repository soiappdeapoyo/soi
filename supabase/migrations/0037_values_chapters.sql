-- El sistema operativo a años (sobre 0035_life_map y 0036_life_plan_reviews).
-- life_maps.core_values: los valores que la persona eligió (3–5); SOI los compara con lo que de verdad hace (conflictos internos).
-- life_assessments.kind admite 'trimestral' y 'anual' (la medición completa de cada capítulo).
-- life_chapters: el cierre de cada capítulo (90 días o un año): lo que logró, lo que aprendió, lo que suelta, su
-- siguiente visión y, en el anual, una carta a su yo de dentro de un año. Nunca se reescriben: son su historia.
-- Creencias, decisiones y aprendizajes viven en agent_knowledge (categoría 'pensamiento' + tag): sin tabla nueva.

ALTER TABLE public.life_maps ADD COLUMN IF NOT EXISTS core_values TEXT[] NOT NULL DEFAULT '{}';
DO $$ BEGIN
  ALTER TABLE public.life_maps ADD CONSTRAINT life_maps_core_values_check CHECK (cardinality(core_values) <= 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.life_assessments DROP CONSTRAINT IF EXISTS life_assessments_kind_check;
ALTER TABLE public.life_assessments ADD CONSTRAINT life_assessments_kind_check
  CHECK (kind IN ('inicial', 'mensual', 'semanal', 'trimestral', 'anual'));

CREATE TABLE IF NOT EXISTS public.life_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('trimestral', 'anual')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  proud TEXT CHECK (proud IS NULL OR char_length(proud) <= 800),
  lesson TEXT CHECK (lesson IS NULL OR char_length(lesson) <= 800),
  letting_go TEXT CHECK (letting_go IS NULL OR char_length(letting_go) <= 400),
  next_vision TEXT CHECK (next_vision IS NULL OR char_length(next_vision) <= 400),
  letter TEXT CHECK (letter IS NULL OR char_length(letter) <= 2000),
  -- Foto del capítulo: calificaciones al inicio y al cierre, Moments, evidencias, hábitos y creencias.
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(snapshot) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, kind, period_end)
);
CREATE INDEX IF NOT EXISTS idx_life_chapters_user ON public.life_chapters (user_id, created_at DESC);

ALTER TABLE public.life_chapters ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lc_select_own" ON public.life_chapters;
CREATE POLICY "lc_select_own" ON public.life_chapters FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "lc_insert_own" ON public.life_chapters;
CREATE POLICY "lc_insert_own" ON public.life_chapters FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "lc_delete_own" ON public.life_chapters;
CREATE POLICY "lc_delete_own" ON public.life_chapters FOR DELETE USING (auth.uid() = user_id);
REVOKE UPDATE ON public.life_chapters FROM anon, authenticated;
