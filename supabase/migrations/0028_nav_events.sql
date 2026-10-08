-- =====================================================
-- 0028 — Aditiva. Navegación dentro de la app para /panel/analytics (fricciones en el flujo).
--  • nav_events: cada pantalla que se abre ('view') y cuándo se deja la app ('leave'), por sesión.
--    Solo la ruta normalizada (IDs reemplazados por :id, sin parámetros salvo ?tab=); nunca contenido.
--  • Sin acceso para clientes: escribe /api/nav (service role) y lee el panel.
--  • purge_nav_events(): borra lo de más de 180 días.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.nav_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL CHECK (char_length(session_id) BETWEEN 8 AND 64),
  kind TEXT NOT NULL CHECK (kind IN ('view', 'leave')),
  path TEXT NOT NULL CHECK (char_length(path) <= 200),
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nav_events_at ON public.nav_events (at DESC);
CREATE INDEX IF NOT EXISTS idx_nav_events_user ON public.nav_events (user_id, at DESC);
CREATE INDEX IF NOT EXISTS idx_nav_events_session ON public.nav_events (session_id, at);

ALTER TABLE public.nav_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nav_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_nav_events()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (DELETE FROM public.nav_events WHERE at < NOW() - INTERVAL '180 days' RETURNING 1)
  SELECT COUNT(*)::INT FROM d;
$$;
REVOKE ALL ON FUNCTION public.purge_nav_events() FROM PUBLIC, anon, authenticated;
