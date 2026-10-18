-- Tu mapa: quién eres hoy, quién quieres ser y la distancia, por área de vida (src/config/life-areas.ts).
-- life_maps: una fila por persona (visión, áreas de enfoque, notas y metas a 90 días por área).
-- life_assessments: cada medición (inicial, mensual o semanal) con su calificación 1–10 por área; nunca se reescriben,
-- así se puede mostrar cuánto se cerró la distancia desde el punto de partida.

CREATE TABLE IF NOT EXISTS public.life_maps (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vision TEXT CHECK (vision IS NULL OR char_length(vision) <= 400),
  focus_areas TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(focus_areas) <= 3),
  -- { "<area>": { "target": 1..10, "want": "cómo se vería", "now": "cómo está hoy" } }
  areas JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(areas) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.life_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('inicial', 'mensual', 'semanal')),
  -- { "<area>": 1..10 } (la semanal puede traer solo las áreas de enfoque)
  scores JSONB NOT NULL CHECK (jsonb_typeof(scores) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_life_assessments_user ON public.life_assessments (user_id, created_at DESC);

ALTER TABLE public.life_maps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lm_own" ON public.life_maps;
CREATE POLICY "lm_own" ON public.life_maps FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Las mediciones se leen y se agregan; no se editan (son el historial de la distancia). Se pueden borrar (sus datos).
DROP POLICY IF EXISTS "la_select_own" ON public.life_assessments;
CREATE POLICY "la_select_own" ON public.life_assessments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "la_insert_own" ON public.life_assessments;
CREATE POLICY "la_insert_own" ON public.life_assessments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "la_delete_own" ON public.life_assessments;
CREATE POLICY "la_delete_own" ON public.life_assessments FOR DELETE USING (auth.uid() = user_id);
REVOKE UPDATE ON public.life_assessments FROM anon, authenticated;
