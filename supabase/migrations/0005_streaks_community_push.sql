-- =====================================================
-- 0005 — Aditiva. Nunca borra datos (Regla de Oro #7).
-- =====================================================

-- Perfil: racha con escudo, país (recursos de crisis), push
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS streak_shields INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_ritual_date DATE;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'MX';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS push_subscription JSONB;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS available_minutes INTEGER;

-- Comunidad: autor visible (RLS de perfiles es privada) y demo
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.community_posts ADD COLUMN IF NOT EXISTS moderation_reason TEXT;

-- Avatar desde Google en usuarios nuevos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Amigo'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- Racha sin castigo + Escudo de Racha
--  • 1 día sin practicar: la racha NO se rompe.
--  • 2 días: se consume un escudo si hay.
--  • Hitos 7/21/40/90 regalan un escudo.
-- =====================================================
CREATE OR REPLACE FUNCTION public.register_ritual_day(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (streak INTEGER, shields INTEGER, milestone INTEGER, used_shield BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_last DATE; v_streak INT; v_shields INT; v_gap INT;
  v_used BOOLEAN := FALSE; v_milestone INT := NULL;
BEGIN
  IF p_user_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT last_ritual_date, streak_current, streak_shields INTO v_last, v_streak, v_shields
  FROM public.user_profiles WHERE user_id = p_user_id FOR UPDATE;

  IF v_last = p_date THEN
    RETURN QUERY SELECT v_streak, v_shields, NULL::INT, FALSE; RETURN;
  END IF;

  v_gap := COALESCE(p_date - v_last, 1);
  IF v_last IS NULL OR v_gap <= 2 THEN
    v_streak := v_streak + 1;
  ELSIF v_gap = 3 AND v_shields > 0 THEN
    v_streak := v_streak + 1; v_shields := v_shields - 1; v_used := TRUE;
  ELSE
    v_streak := 1;
  END IF;

  IF v_streak IN (7, 21, 40, 90) THEN
    v_milestone := v_streak; v_shields := v_shields + 1;
  END IF;

  UPDATE public.user_profiles
  SET streak_current = v_streak,
      streak_longest = GREATEST(streak_longest, v_streak),
      streak_shields = v_shields,
      last_ritual_date = p_date,
      ritual_phase = CASE
        WHEN v_streak >= 40 THEN 'manifestacion'
        WHEN v_streak >= 21 THEN 'alineacion'
        WHEN v_streak >= 7 THEN 'vacio'
        ELSE 'chispa' END
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT v_streak, v_shields, v_milestone, v_used;
END;
$$;

-- =====================================================
-- Reacciones atómicas (toggle) con contador en JSONB
-- =====================================================
CREATE OR REPLACE FUNCTION public.toggle_reaction(p_post_id UUID, p_reaction TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists BOOLEAN; v_reactions JSONB;
BEGIN
  IF p_reaction NOT IN ('amen', 'fuerza', 'gracias', 'corazon') THEN RAISE EXCEPTION 'invalid reaction'; END IF;
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.community_reactions
    WHERE post_id = p_post_id AND user_id = auth.uid() AND reaction = p_reaction) INTO v_exists;

  IF v_exists THEN
    DELETE FROM public.community_reactions WHERE post_id = p_post_id AND user_id = auth.uid() AND reaction = p_reaction;
  ELSE
    INSERT INTO public.community_reactions (post_id, user_id, reaction) VALUES (p_post_id, auth.uid(), p_reaction);
  END IF;

  UPDATE public.community_posts
  SET reactions = jsonb_set(reactions, ARRAY[p_reaction],
      to_jsonb(GREATEST(COALESCE((reactions->>p_reaction)::INT, 0) + CASE WHEN v_exists THEN -1 ELSE 1 END, 0)))
  WHERE id = p_post_id
  RETURNING reactions INTO v_reactions;

  RETURN v_reactions;
END;
$$;

-- =====================================================
-- Endurecimiento de seguridad (antes en 0003/0004; movido aquí para no editar migraciones aplicadas)
-- =====================================================
DROP POLICY IF EXISTS "cp_select_public" ON public.community_posts;
CREATE POLICY "cp_select_public" ON public.community_posts
  FOR SELECT USING ((is_public = TRUE AND flagged = FALSE) OR auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.decrement_free_query(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.user_profiles
  SET free_queries_remaining = GREATEST(free_queries_remaining - 1, 0),
      is_paywalled = (free_queries_remaining - 1 <= 0),
      updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Solo service role (cron) puede expirar trials
REVOKE EXECUTE ON FUNCTION public.expire_trials() FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_ak_evidence ON public.agent_knowledge (user_id, created_at DESC) WHERE category = 'evidencia';
CREATE INDEX IF NOT EXISTS idx_up_plan ON public.user_profiles (plan);

-- =====================================================
-- Anti-bypass de paywall: el cliente NO puede escribir plan, cobro ni contadores.
-- Solo columnas de perfil editables; plan/stripe/trial/racha via service role o funciones SECURITY DEFINER.
-- =====================================================
REVOKE UPDATE ON public.user_profiles FROM anon, authenticated;
GRANT UPDATE (
  display_name, avatar_url, archetype, dominant_emotion, recurring_themes, spiritual_framework,
  goals, blockers, preferred_routine, onboarding_completed, voice_preference, tts_enabled,
  morning_time, evening_time, timezone, country, available_minutes, weakest_link, push_subscription, updated_at
) ON public.user_profiles TO authenticated;

-- Transición perezosa trial → free para el usuario actual (cuando el cron aún no corrió)
CREATE OR REPLACE FUNCTION public.start_free_plan_if_trial_expired()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.user_profiles
  SET plan = 'free', is_paywalled = FALSE, free_queries_remaining = 19
  WHERE user_id = auth.uid() AND plan = 'trial' AND trial_ends_at <= NOW();
END;
$$;
