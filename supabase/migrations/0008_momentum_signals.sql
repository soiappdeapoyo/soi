-- =====================================================
-- 0008 — Aditiva. Señales del ciclo inspiración → reflexión → acción.
--  • video_watched: la persona terminó un video dentro de SOI (inspiración).
--  • checkin: la persona dijo cómo llega hoy (alta energía, cansancio, ansiedad, confusión).
-- Solo amplía los valores permitidos; no cambia ni borra datos.
-- =====================================================
ALTER TABLE public.momentum_events DROP CONSTRAINT IF EXISTS momentum_events_kind_check;
ALTER TABLE public.momentum_events ADD CONSTRAINT momentum_events_kind_check CHECK (kind IN (
  'return', 'action_completed', 'ritual_completed', 'routine_completed', 'evidence_saved',
  'reflection', 'goal_set', 'blueprint_implemented', 'blueprint_step', 'blueprint_completed',
  'video_watched', 'checkin'
));

CREATE INDEX IF NOT EXISTS idx_momentum_user_kind ON public.momentum_events (user_id, kind, created_at DESC);
