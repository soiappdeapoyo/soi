-- =====================================================
-- 0038 — Aditiva. Análisis de product-market fit del panel (/panel/analyticsAI).
--  • admin_analyses: cada análisis guardado para consultarlo después.
--    kind 'rules' = análisis por reglas (con la foto de los datos en `snapshot`);
--    kind 'ai' = la lectura de la IA sobre un análisis por reglas (`parent_id`).
--  • `fingerprint` evita guardar dos veces el mismo análisis por reglas si los datos no cambiaron.
--  • Solo cifras agregadas; nunca contenido de nadie. Sin acceso para clientes: lee y escribe el panel (service role).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('rules', 'ai')),
  parent_id UUID REFERENCES public.admin_analyses(id) ON DELETE CASCADE,
  period_days INT NOT NULL CHECK (period_days BETWEEN 1 AND 365),
  verdict TEXT CHECK (char_length(verdict) <= 80),
  score INT CHECK (score BETWEEN 0 AND 100),
  fingerprint TEXT CHECK (char_length(fingerprint) <= 64),
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  content TEXT NOT NULL CHECK (char_length(content) <= 60000),
  provider TEXT CHECK (char_length(provider) <= 20),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((kind = 'ai') = (parent_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_admin_analyses_created ON public.admin_analyses (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_analyses_parent ON public.admin_analyses (parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_analyses_rules ON public.admin_analyses (period_days, created_at DESC) WHERE kind = 'rules';

ALTER TABLE public.admin_analyses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_analyses FROM anon, authenticated;
