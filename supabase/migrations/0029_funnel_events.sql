-- =====================================================
-- 0029 — Aditiva. Embudo de la landing y registros (para /panel/analytics y las notificaciones del panel).
--  • funnel_events: visita a la landing, toque en un botón para entrar, llegada a /login, inicio con Google o
--    enlace mágico, registro o inicio de sesión. Visitante anónimo (cookie propia soi_vid), país, región y
--    ciudad que da Vercel por la IP (la IP no se guarda), dominio de referencia y, al entrar, la cuenta.
--  • Sin acceso para clientes: escribe /api/funnel y /auth/callback (service role), lee el panel.
--  • purge_funnel_events(): borra lo de más de 365 días.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.funnel_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id TEXT CHECK (char_length(visitor_id) BETWEEN 8 AND 64),
  event TEXT NOT NULL CHECK (event IN ('landing_view', 'cta_click', 'login_view', 'auth_start', 'signup', 'login')),
  detail TEXT CHECK (char_length(detail) <= 60),
  country TEXT CHECK (char_length(country) <= 8),
  region TEXT CHECK (char_length(region) <= 80),
  city TEXT CHECK (char_length(city) <= 80),
  referrer TEXT CHECK (char_length(referrer) <= 120),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_funnel_events_at ON public.funnel_events (at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_event ON public.funnel_events (event, at DESC);
CREATE INDEX IF NOT EXISTS idx_funnel_events_visitor ON public.funnel_events (visitor_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_user ON public.funnel_events (user_id) WHERE user_id IS NOT NULL;

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.funnel_events FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_funnel_events()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (DELETE FROM public.funnel_events WHERE at < NOW() - INTERVAL '365 days' RETURNING 1)
  SELECT COUNT(*)::INT FROM d;
$$;
REVOKE ALL ON FUNCTION public.purge_funnel_events() FROM PUBLIC, anon, authenticated;
