-- =====================================================
-- 0033 — Aditiva. Recordatorios para volver a SOI (notificaciones push con alarma).
--  • user_profiles.reminder_time ('HH:MM', hora local; null = la hora por defecto) y reminders_enabled.
--  • notification_log: qué se envió a quién y cuándo (un aviso por tipo y referencia por día local; evita
--    duplicados aunque el programador corra cada 5 min). Solo el servidor (service role) lo lee y escribe.
--  • Programador: pg_cron cada 5 min llama a /api/cron/reminders con pg_net (Vercel Hobby solo permite un cron
--    al día). La URL y el secreto viven en Supabase Vault (`soi_app_url`, `soi_cron_secret`), nunca en git;
--    sin ellos la función no hace nada.
-- =====================================================

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS reminder_time TEXT CHECK (reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE;
GRANT UPDATE (reminder_time, reminders_enabled) ON public.user_profiles TO authenticated;

CREATE TABLE IF NOT EXISTS public.notification_log (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('moment', 'nudge', 'scheduled')),
  ref TEXT NOT NULL CHECK (char_length(ref) <= 80),
  local_date DATE NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, kind, ref, local_date)
);
CREATE INDEX IF NOT EXISTS idx_notification_log_user ON public.notification_log (user_id, local_date DESC);
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.notification_log FROM anon, authenticated;

-- ---------- Programador (pg_cron + pg_net) ----------
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.invoke_reminders()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_url TEXT; v_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'soi_app_url';
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'soi_cron_secret';
  IF v_url IS NULL OR v_secret IS NULL THEN RETURN; END IF;
  PERFORM net.http_get(
    url := v_url || '/api/cron/reminders',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 55000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.invoke_reminders() FROM PUBLIC, anon, authenticated;

-- Retención: el registro de avisos solo sirve para no repetir y medir; 90 días bastan.
CREATE OR REPLACE FUNCTION public.purge_notification_log()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (DELETE FROM public.notification_log WHERE sent_at < NOW() - INTERVAL '90 days' RETURNING 1)
  SELECT COUNT(*)::INT FROM d;
$$;
REVOKE ALL ON FUNCTION public.purge_notification_log() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname IN ('soi-reminders', 'soi-purge-notification-log');
  PERFORM cron.schedule('soi-reminders', '*/5 * * * *', 'SELECT public.invoke_reminders()');
  PERFORM cron.schedule('soi-purge-notification-log', '30 4 * * *', 'SELECT public.purge_notification_log()');
END $$;
