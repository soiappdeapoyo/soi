-- =====================================================
-- 0024 — Aditiva. Panel de administración.
--  • app_settings: tarifas, días de prueba, consultas gratis, tope de voz y límites de tokens, editables desde
--    /panel. Sin acceso para anon/authenticated (lo lee y escribe el servidor con service role; las funciones
--    SQL lo leen con setting_int).
--  • admin_audit: quién abrió qué cuenta, conversación o cambió qué ajuste (solo service role).
--  • Días de prueba y consultas gratis dejan de estar fijos (7 y 20): se leen de app_settings.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY CHECK (key ~ '^[a-z_]{2,40}$'),
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_settings FROM anon, authenticated;

INSERT INTO public.app_settings (key, value) VALUES
  ('trial_days', '7'),
  ('free_query_limit', '20'),
  ('tts_daily_minutes', '20'),
  ('chat_max_output_tokens', '0'),
  ('daily_token_limit_free', '0'),
  ('daily_token_limit_plus', '0'),
  ('plans', '{"monthly":{"price":4.99,"stripePriceId":null},"yearly":{"price":29.99,"stripePriceId":null}}')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.admin_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (char_length(action) <= 60),
  target_user UUID,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit (created_at DESC);
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit FROM anon, authenticated;

-- Entero de app_settings (con valor por defecto si falta o no es número).
CREATE OR REPLACE FUNCTION public.setting_int(p_key TEXT, p_default INT)
RETURNS INT LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v INT;
BEGIN
  SELECT (value #>> '{}')::INT INTO v FROM public.app_settings WHERE key = p_key;
  RETURN COALESCE(v, p_default);
EXCEPTION WHEN others THEN
  RETURN p_default;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.setting_int(TEXT, INT) FROM PUBLIC, anon, authenticated;

-- Días de prueba para quien se registra desde ahora (los trials en curso no cambian).
ALTER TABLE public.user_profiles ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + make_interval(days => public.setting_int('trial_days', 7)));

CREATE OR REPLACE FUNCTION public.consume_chat_query()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan TEXT; v_trial_ends TIMESTAMPTZ; v_remaining INT; v_limit INT := public.setting_int('free_query_limit', 20);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT plan, trial_ends_at, free_queries_remaining INTO v_plan, v_trial_ends, v_remaining
  FROM public.user_profiles WHERE user_id = auth.uid() FOR UPDATE;

  IF v_plan IS NULL THEN RETURN 'exhausted'; END IF;
  IF v_plan = 'soi_plus' THEN RETURN 'unlimited'; END IF;
  IF v_plan = 'trial' AND v_trial_ends > NOW() THEN RETURN 'unlimited'; END IF;

  -- Transición perezosa trial → free (el cron aún no corrió): pool completo configurado.
  IF v_plan = 'trial' THEN
    v_remaining := v_limit;
    UPDATE public.user_profiles SET plan = 'free', is_paywalled = FALSE WHERE user_id = auth.uid();
  END IF;

  IF v_remaining <= 0 THEN
    UPDATE public.user_profiles SET free_queries_remaining = 0, is_paywalled = TRUE WHERE user_id = auth.uid();
    RETURN 'exhausted';
  END IF;

  UPDATE public.user_profiles
  SET free_queries_remaining = v_remaining - 1,
      is_paywalled = (v_remaining - 1 <= 0),
      updated_at = NOW()
  WHERE user_id = auth.uid();
  RETURN 'consumed';
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_chat_query()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.user_profiles
  SET free_queries_remaining = LEAST(free_queries_remaining + 1, public.setting_int('free_query_limit', 20)),
      is_paywalled = FALSE,
      updated_at = NOW()
  WHERE user_id = auth.uid() AND plan = 'free';
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_profiles
  SET plan = 'free',
      is_paywalled = FALSE,
      free_queries_remaining = public.setting_int('free_query_limit', 20)
  WHERE plan = 'trial' AND trial_ends_at <= NOW();
END;
$$;

CREATE OR REPLACE FUNCTION public.start_free_plan_if_trial_expired()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_profiles
  SET plan = 'free', is_paywalled = FALSE, free_queries_remaining = GREATEST(public.setting_int('free_query_limit', 20) - 1, 0)
  WHERE user_id = auth.uid() AND plan = 'trial' AND trial_ends_at <= NOW();
END;
$$;

-- Los permisos de estas funciones no cambian al reemplazarlas (CREATE OR REPLACE conserva los GRANT).
