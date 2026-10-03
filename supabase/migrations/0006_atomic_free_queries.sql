-- =====================================================
-- 0006 — Aditiva. Consultas Free atómicas + reembolso.
--  • consume_chat_query: comprueba y descuenta en una sola operación con bloqueo de fila
--    (dos peticiones simultáneas con 1 consulta restante ya no pasan ambas).
--  • refund_chat_query: devuelve la consulta si todos los proveedores de IA fallaron.
--  • Retención de crisis_log: purga automática a 90 días (solo service role puede ejecutarla).
-- =====================================================

CREATE OR REPLACE FUNCTION public.consume_chat_query()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plan TEXT; v_trial_ends TIMESTAMPTZ; v_remaining INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT plan, trial_ends_at, free_queries_remaining INTO v_plan, v_trial_ends, v_remaining
  FROM public.user_profiles WHERE user_id = auth.uid() FOR UPDATE;

  IF v_plan IS NULL THEN RETURN 'exhausted'; END IF;
  IF v_plan = 'soi_plus' THEN RETURN 'unlimited'; END IF;
  IF v_plan = 'trial' AND v_trial_ends > NOW() THEN RETURN 'unlimited'; END IF;

  -- Transición perezosa trial → free (el cron aún no corrió): pool completo de 20.
  IF v_plan = 'trial' THEN
    v_remaining := 20;
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
  SET free_queries_remaining = LEAST(free_queries_remaining + 1, 20),
      is_paywalled = FALSE,
      updated_at = NOW()
  WHERE user_id = auth.uid() AND plan = 'free';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_chat_query() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.refund_chat_query() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_chat_query() TO authenticated;
GRANT EXECUTE ON FUNCTION public.refund_chat_query() TO authenticated;

-- crisis_log: dato muy sensible. Purga a 90 días (llamar desde cron con service role).
CREATE OR REPLACE FUNCTION public.purge_crisis_logs()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.agent_knowledge
  WHERE category = 'crisis_log' AND created_at < NOW() - INTERVAL '90 days';
$$;
REVOKE EXECUTE ON FUNCTION public.purge_crisis_logs() FROM PUBLIC, anon, authenticated;
