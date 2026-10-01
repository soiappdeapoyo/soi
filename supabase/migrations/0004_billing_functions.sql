-- Decrementa el pool de consultas del plan Free (no se resetea por día)
CREATE OR REPLACE FUNCTION public.decrement_free_query(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_profiles
  SET free_queries_remaining = GREATEST(free_queries_remaining - 1, 0),
      is_paywalled = (free_queries_remaining - 1 <= 0),
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Cron diario: transicionar de trial a free
CREATE OR REPLACE FUNCTION public.expire_trials()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_profiles
  SET plan = 'free',
      is_paywalled = FALSE,
      free_queries_remaining = 20
  WHERE plan = 'trial' AND trial_ends_at <= NOW();
END;
$$;
