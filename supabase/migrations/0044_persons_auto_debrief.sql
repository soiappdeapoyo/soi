-- /persons: el feedback de Ale llega solo al terminar una plática (sin mensajes tuyos en 25 min). `auto_debrief_at`
-- aparta cada plática antes de prepararlo, para que dos consultas seguidas de la lista no lo hagan dos veces.
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS auto_debrief_at TIMESTAMPTZ;
