-- /persons (Háblame): prueba de 3 días e invitaciones que suman días.
--  - user_profiles.referral_code: el código del link para invitar (/persons/entrar?ref=<código>); solo servidor.
--  - persons_referrals: quién invitó a quién (una fila por cuenta invitada), cuándo empezó a practicar de verdad
--    (`activated_at`) y los días que ganó quien invitó.
--  - activate_referral: al activarse una invitación (sus primeros mensajes), da los días a quien invitó en una sola
--    transacción (la primera vale p_first días; las siguientes, p_next; tope p_max invitaciones con premio). Si ya no
--    tiene prueba, la reabre; si tiene Plus, la suscripción no cambia.

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_referral_code ON public.user_profiles (referral_code) WHERE referral_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.persons_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  reward_days INTEGER NOT NULL DEFAULT 0,
  rewarded_at TIMESTAMPTZ,
  CHECK (referrer_id <> referred_id)
);
CREATE INDEX IF NOT EXISTS idx_persons_referrals_referrer ON public.persons_referrals (referrer_id, created_at DESC);

ALTER TABLE public.persons_referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "persons_referrals_select_own" ON public.persons_referrals;
CREATE POLICY "persons_referrals_select_own" ON public.persons_referrals FOR SELECT USING (auth.uid() = referrer_id);
REVOKE ALL ON public.persons_referrals FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.persons_referrals FROM authenticated;

CREATE OR REPLACE FUNCTION public.activate_referral(p_referred UUID, p_first INTEGER, p_next INTEGER, p_max INTEGER)
RETURNS TABLE (referrer_id UUID, days INTEGER)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ref public.persons_referrals;
  v_rewarded INTEGER;
  v_days INTEGER;
BEGIN
  UPDATE public.persons_referrals SET activated_at = NOW()
  WHERE persons_referrals.referred_id = p_referred AND activated_at IS NULL
  RETURNING * INTO v_ref;
  IF NOT FOUND THEN RETURN; END IF;

  -- Una a la vez por quien invita: dos activaciones simultáneas no cuentan las dos como «la primera».
  PERFORM 1 FROM public.user_profiles WHERE user_id = v_ref.referrer_id FOR UPDATE;
  SELECT count(*) INTO v_rewarded FROM public.persons_referrals r
  WHERE r.referrer_id = v_ref.referrer_id AND r.rewarded_at IS NOT NULL AND r.reward_days > 0;
  v_days := CASE WHEN v_rewarded >= p_max THEN 0 WHEN v_rewarded = 0 THEN p_first ELSE p_next END;

  UPDATE public.persons_referrals SET reward_days = v_days, rewarded_at = NOW() WHERE id = v_ref.id;
  IF v_days > 0 THEN
    UPDATE public.user_profiles
    SET plan = CASE WHEN plan = 'soi_plus' THEN plan ELSE 'trial' END,
        trial_ends_at = GREATEST(COALESCE(trial_ends_at, NOW()), NOW()) + make_interval(days => v_days),
        updated_at = NOW()
    WHERE user_id = v_ref.referrer_id;
  END IF;
  RETURN QUERY SELECT v_ref.referrer_id, v_days;
END;
$$;
REVOKE ALL ON FUNCTION public.activate_referral(UUID, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_referral(UUID, INTEGER, INTEGER, INTEGER) TO service_role;
