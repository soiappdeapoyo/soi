-- Bienestar medido sin preguntas: estimación de los 5 ítems del WHO-5 (OMS) deducida de las conversaciones y del
-- cumplimiento y ánimo de los Moments. No es el cuestionario autoaplicado ni un diagnóstico.
--  - wellbeing_observations: lo que el chat deja ver de cada ítem (una fila por conversación e ítem; la última lectura
--    de esa conversación reemplaza a la anterior). Las señales de Moments y check-ins se calculan al vuelo.
--  - wellbeing_estimates: una estimación por persona y semana (domingo de cierre), para ver la evolución.
-- Solo escribe el servidor; cada quien lee lo suyo.

CREATE TABLE IF NOT EXISTS public.wellbeing_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item TEXT NOT NULL CHECK (item IN ('cheerful', 'calm', 'active', 'rested', 'interest')),
  value NUMERIC(3, 2) NOT NULL CHECK (value BETWEEN 0 AND 5),
  weight REAL NOT NULL DEFAULT 1 CHECK (weight > 0 AND weight <= 3),
  source TEXT NOT NULL CHECK (source IN ('chat', 'chat_rules')),
  ref TEXT NOT NULL,
  evidence TEXT CHECK (char_length(evidence) <= 160),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ref, item)
);
CREATE INDEX IF NOT EXISTS idx_wellbeing_obs_user ON public.wellbeing_observations (user_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS public.wellbeing_estimates (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_end DATE NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
  items JSONB NOT NULL DEFAULT '{}',
  confidence TEXT NOT NULL CHECK (confidence IN ('baja', 'media', 'alta')),
  observations INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, week_end)
);

ALTER TABLE public.wellbeing_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wellbeing_estimates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wo_select_own" ON public.wellbeing_observations;
CREATE POLICY "wo_select_own" ON public.wellbeing_observations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "we_select_own" ON public.wellbeing_estimates;
CREATE POLICY "we_select_own" ON public.wellbeing_estimates FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.wellbeing_observations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.wellbeing_estimates FROM anon, authenticated;
REVOKE ALL ON public.wellbeing_observations FROM anon;
REVOKE ALL ON public.wellbeing_estimates FROM anon;
