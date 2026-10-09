-- =====================================================
-- 0030 — Aditiva. La animación "cómo funciona SOI" (landing y /emociones) entra al embudo:
--  • film_progress: escena alcanzada (detail = "<lugar>:<1-5>", una vez por carga).
--  • film_interact: pausa, reproducir o toque de escena (detail = "<lugar>:pause|play|scene").
--  Solo amplía el CHECK de funnel_events.event; nada se borra.
-- =====================================================

ALTER TABLE public.funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_check;
ALTER TABLE public.funnel_events ADD CONSTRAINT funnel_events_event_check
  CHECK (event IN ('landing_view', 'cta_click', 'login_view', 'auth_start', 'signup', 'login', 'film_progress', 'film_interact'));
