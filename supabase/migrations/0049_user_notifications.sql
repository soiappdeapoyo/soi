-- Campanita de notificaciones dentro de la app: avisos que escribe administración desde /panel/avisos (a todas las
-- cuentas de SOI o a una) y automáticos (p. ej. «Usa SOI un mes gratis» al terminar la prueba). Una fila por persona y
-- aviso; `read_at` = ya lo vio. Solo escribe el servidor; cada quien lee los suyos.
CREATE TABLE IF NOT EXISTS public.notification_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  url TEXT CHECK (url IS NULL OR char_length(url) <= 300),
  audience TEXT NOT NULL CHECK (audience IN ('all', 'user')),
  target_user UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipients INT NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notification_broadcasts_created_idx ON public.notification_broadcasts (created_at DESC);
ALTER TABLE public.notification_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'admin' CHECK (kind IN ('admin', 'trial_feedback')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 120),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  url TEXT CHECK (url IS NULL OR char_length(url) <= 300),
  -- Para no repetir un automático (p. ej. `trial-feedback:<fin de la prueba>`).
  ref TEXT CHECK (ref IS NULL OR char_length(ref) <= 120),
  broadcast_id UUID REFERENCES public.notification_broadcasts(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS user_notifications_user_idx ON public.user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_notifications_unread_idx ON public.user_notifications (user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS user_notifications_broadcast_idx ON public.user_notifications (broadcast_id) WHERE broadcast_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS user_notifications_ref_uniq ON public.user_notifications (user_id, ref) WHERE ref IS NOT NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_notifications_select_own ON public.user_notifications;
CREATE POLICY user_notifications_select_own ON public.user_notifications FOR SELECT USING (auth.uid() = user_id);

-- Días de prueba ganados con su opinión en la burbuja (7 por opinión, hasta 21: 28 días en total). Solo servidor.
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS feedback_reward_days INT NOT NULL DEFAULT 0;
