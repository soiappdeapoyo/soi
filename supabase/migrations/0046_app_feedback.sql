-- Retroalimentación de SOI (burbuja «Tu opinión»): qué le gusta y qué cambiaría, con una calificación de 4 caras y el
-- contexto (pantalla, dispositivo, plan, días con la cuenta). Solo escribe el servidor (/api/feedback, que revisa crisis);
-- cada quien lee lo suyo; el panel lo lee con service role.
CREATE TABLE IF NOT EXISTS public.app_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 4),
  liked TEXT CHECK (char_length(liked) <= 1000),
  disliked TEXT CHECK (char_length(disliked) <= 1000),
  path TEXT CHECK (char_length(path) <= 200),
  device TEXT CHECK (device IN ('android', 'ios', 'desktop', 'other')),
  plan TEXT CHECK (char_length(plan) <= 20),
  account_days INT,
  source TEXT NOT NULL DEFAULT 'bubble' CHECK (source IN ('bubble', 'prompt')),
  crisis BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (rating IS NOT NULL OR liked IS NOT NULL OR disliked IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS app_feedback_created_idx ON public.app_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS app_feedback_user_idx ON public.app_feedback (user_id, created_at DESC);

ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_feedback_select_own ON public.app_feedback;
CREATE POLICY app_feedback_select_own ON public.app_feedback FOR SELECT USING (auth.uid() = user_id);

-- Cuándo se le abrió sola la burbuja (una sola vez en la vida de la cuenta). Solo servidor.
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS feedback_prompted_at TIMESTAMPTZ;
