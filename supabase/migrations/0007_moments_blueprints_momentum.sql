-- =====================================================
-- 0007 — Aditiva. SOI Moments, Blueprints, Creator Economy y Momentum.
--  • La unidad social es una evidencia de evolución (soi_moments), no un post.
--  • Un Moment con resultados se vuelve Blueprint reusable (gratis o premium).
--  • Los contadores (resonancia, implementaciones, completados) solo cambian vía RPC:
--    el cliente no puede inflar métricas ni el Transformation Score de un creador.
--  • Las compras solo las registra el webhook de Stripe (service role).
-- =====================================================

-- ---------- Creadores ----------
CREATE TABLE IF NOT EXISTS public.creator_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  handle TEXT NOT NULL UNIQUE CHECK (handle ~ '^[a-z0-9_]{3,30}$'),
  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 60),
  bio TEXT CHECK (char_length(bio) <= 400),
  avatar_url TEXT,
  -- "Creator Intelligence": el método que la IA aplica a la vida de cada persona
  methodology TEXT CHECK (char_length(methodology) <= 3000),
  principles TEXT[] NOT NULL DEFAULT '{}',
  boundaries TEXT[] NOT NULL DEFAULT '{}',
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Blueprints ----------
CREATE TABLE IF NOT EXISTS public.soi_blueprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moment_id UUID,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  objective TEXT NOT NULL CHECK (char_length(objective) BETWEEN 3 AND 500),
  required_minutes INTEGER NOT NULL DEFAULT 10 CHECK (required_minutes BETWEEN 1 AND 240),
  duration_days INTEGER NOT NULL DEFAULT 7 CHECK (duration_days BETWEEN 1 AND 365),
  difficulty TEXT NOT NULL DEFAULT 'suave' CHECK (difficulty IN ('suave', 'media', 'intensa')),
  eslabon TEXT NOT NULL DEFAULT 'accion' CHECK (eslabon IN ('pensamiento', 'emocion', 'accion', 'resultado')),
  target_states TEXT[] NOT NULL DEFAULT '{}',
  steps JSONB NOT NULL DEFAULT '[]',              -- ActionCard[]
  source TEXT NOT NULL CHECK (char_length(source) BETWEEN 2 AND 200), -- Regla: toda rutina cita su fuente
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium')),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents = 0 OR price_cents BETWEEN 100 AND 50000),
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  implementations_count INTEGER NOT NULL DEFAULT 0,
  completions_count INTEGER NOT NULL DEFAULT 0,
  steps_completed_count INTEGER NOT NULL DEFAULT 0,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((tier = 'free' AND price_cents = 0) OR (tier = 'premium' AND price_cents >= 100))
);
CREATE INDEX IF NOT EXISTS idx_bp_published ON public.soi_blueprints (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bp_creator ON public.soi_blueprints (creator_id);

-- ---------- Moments ----------
CREATE TABLE IF NOT EXISTS public.soi_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT,
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 120),
  category TEXT NOT NULL DEFAULT 'accion' CHECK (category IN ('pensamiento', 'emocion', 'accion', 'resultado')),
  trigger_state TEXT[] NOT NULL DEFAULT '{}',
  source_type TEXT NOT NULL DEFAULT 'personal_experience'
    CHECK (source_type IN ('video', 'book', 'podcast', 'personal_experience', 'ai_generated')),
  source_reference TEXT CHECK (char_length(source_reference) <= 200),
  insight TEXT NOT NULL CHECK (char_length(insight) BETWEEN 3 AND 1000),
  reflection_question TEXT CHECK (char_length(reflection_question) <= 300),
  user_reflection TEXT CHECK (char_length(user_reflection) <= 2000),
  actions JSONB NOT NULL DEFAULT '[]',            -- ActionCard[]
  evidence JSONB NOT NULL DEFAULT '{}',           -- { completed_actions, created_habits, achieved_results }
  visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'community')),
  blueprint_id UUID REFERENCES public.soi_blueprints(id) ON DELETE SET NULL,
  resonance_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_moments_feed ON public.soi_moments (visibility, created_at DESC) WHERE flagged = FALSE;
CREATE INDEX IF NOT EXISTS idx_moments_creator ON public.soi_moments (creator_id, created_at DESC);

DO $$ BEGIN
  ALTER TABLE public.soi_blueprints
    ADD CONSTRAINT soi_blueprints_moment_fk FOREIGN KEY (moment_id) REFERENCES public.soi_moments(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.moment_interactions (
  moment_id UUID NOT NULL REFERENCES public.soi_moments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('resonance', 'save')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (moment_id, user_id, kind)
);

-- ---------- Implementaciones y compras ----------
CREATE TABLE IF NOT EXISTS public.blueprint_implementations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES public.soi_blueprints(id) ON DELETE CASCADE,
  adapted_steps JSONB NOT NULL DEFAULT '[]',      -- versión adaptada por la IA a la realidad de la persona
  adapted_minutes INTEGER,
  adaptation_note TEXT,
  completed_steps INTEGER[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
  result_note TEXT CHECK (char_length(result_note) <= 1000),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, blueprint_id)
);
CREATE INDEX IF NOT EXISTS idx_impl_bp_started ON public.blueprint_implementations (blueprint_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.blueprint_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blueprint_id UUID NOT NULL REFERENCES public.soi_blueprints(id) ON DELETE RESTRICT,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  amount_cents INTEGER NOT NULL,
  creator_share_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT NOT NULL UNIQUE,
  payout_status TEXT NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, blueprint_id)
);

-- ---------- Momentum ----------
CREATE TABLE IF NOT EXISTS public.momentum_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'return', 'action_completed', 'ritual_completed', 'routine_completed', 'evidence_saved',
    'reflection', 'goal_set', 'blueprint_implemented', 'blueprint_step', 'blueprint_completed'
  )),
  eslabon TEXT CHECK (eslabon IN ('pensamiento', 'emocion', 'accion', 'resultado')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_momentum_user ON public.momentum_events (user_id, created_at DESC);

-- =====================================================
-- RLS
-- =====================================================
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soi_blueprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soi_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_implementations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blueprint_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.momentum_events ENABLE ROW LEVEL SECURITY;

-- Perfiles de creador: públicos (embudo desde Instagram/TikTok); cada quien edita el suyo.
DROP POLICY IF EXISTS "cr_select_all" ON public.creator_profiles;
CREATE POLICY "cr_select_all" ON public.creator_profiles FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "cr_insert_own" ON public.creator_profiles;
CREATE POLICY "cr_insert_own" ON public.creator_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "cr_update_own" ON public.creator_profiles;
CREATE POLICY "cr_update_own" ON public.creator_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Blueprints: publicados visibles para todos; borradores solo para su creador (que debe tener perfil de creador).
DROP POLICY IF EXISTS "bp_select" ON public.soi_blueprints;
CREATE POLICY "bp_select" ON public.soi_blueprints FOR SELECT USING (status = 'published' OR auth.uid() = creator_id);
DROP POLICY IF EXISTS "bp_insert_creator" ON public.soi_blueprints;
CREATE POLICY "bp_insert_creator" ON public.soi_blueprints FOR INSERT
  WITH CHECK (auth.uid() = creator_id AND EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.user_id = auth.uid()));
DROP POLICY IF EXISTS "bp_update_own" ON public.soi_blueprints;
CREATE POLICY "bp_update_own" ON public.soi_blueprints FOR UPDATE USING (auth.uid() = creator_id);

-- Moments: comunidad visible para personas con sesión; privados solo para su autor.
DROP POLICY IF EXISTS "mo_select" ON public.soi_moments;
CREATE POLICY "mo_select" ON public.soi_moments FOR SELECT
  USING (auth.uid() = creator_id OR (visibility = 'community' AND flagged = FALSE AND auth.uid() IS NOT NULL));
DROP POLICY IF EXISTS "mo_insert_own" ON public.soi_moments;
CREATE POLICY "mo_insert_own" ON public.soi_moments FOR INSERT WITH CHECK (auth.uid() = creator_id);
DROP POLICY IF EXISTS "mo_update_own" ON public.soi_moments;
CREATE POLICY "mo_update_own" ON public.soi_moments FOR UPDATE USING (auth.uid() = creator_id);
DROP POLICY IF EXISTS "mo_delete_own" ON public.soi_moments;
CREATE POLICY "mo_delete_own" ON public.soi_moments FOR DELETE USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "mi_select_own" ON public.moment_interactions;
CREATE POLICY "mi_select_own" ON public.moment_interactions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bi_select_own" ON public.blueprint_implementations;
CREATE POLICY "bi_select_own" ON public.blueprint_implementations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "bpp_select_own" ON public.blueprint_purchases;
CREATE POLICY "bpp_select_own" ON public.blueprint_purchases FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

DROP POLICY IF EXISTS "me_select_own" ON public.momentum_events;
CREATE POLICY "me_select_own" ON public.momentum_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "me_insert_own" ON public.momentum_events;
CREATE POLICY "me_insert_own" ON public.momentum_events FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Permisos por columna: contadores, verificación y estado de pago no se escriben desde el cliente.
REVOKE INSERT, UPDATE ON public.creator_profiles FROM anon, authenticated;
GRANT INSERT (user_id, handle, display_name, bio, avatar_url, methodology, principles, boundaries) ON public.creator_profiles TO authenticated;
GRANT UPDATE (display_name, bio, avatar_url, methodology, principles, boundaries, updated_at) ON public.creator_profiles TO authenticated;

REVOKE INSERT, UPDATE ON public.soi_blueprints FROM anon, authenticated;
GRANT INSERT (creator_id, moment_id, title, objective, required_minutes, duration_days, difficulty, eslabon, target_states, steps, source, tier, price_cents, currency, status)
  ON public.soi_blueprints TO authenticated;
GRANT UPDATE (title, objective, required_minutes, duration_days, difficulty, eslabon, target_states, steps, source, tier, price_cents, status, updated_at)
  ON public.soi_blueprints TO authenticated;

REVOKE INSERT, UPDATE ON public.soi_moments FROM anon, authenticated;
GRANT INSERT (creator_id, author_name, title, category, trigger_state, source_type, source_reference, insight, reflection_question, user_reflection, actions, evidence, visibility, blueprint_id)
  ON public.soi_moments TO authenticated;
GRANT UPDATE (title, category, trigger_state, source_type, source_reference, insight, reflection_question, user_reflection, actions, evidence, visibility, blueprint_id, updated_at)
  ON public.soi_moments TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.moment_interactions, public.blueprint_implementations, public.blueprint_purchases FROM anon, authenticated;
REVOKE UPDATE, DELETE ON public.momentum_events FROM anon, authenticated;

-- =====================================================
-- RPC
-- =====================================================

-- Resonancia / Guardar (atómico, con contador).
CREATE OR REPLACE FUNCTION public.toggle_moment_interaction(p_moment_id UUID, p_kind TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists BOOLEAN; v_delta INT; v_row public.soi_moments%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_kind NOT IN ('resonance', 'save') THEN RAISE EXCEPTION 'invalid kind'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.soi_moments WHERE id = p_moment_id
                 AND (creator_id = auth.uid() OR (visibility = 'community' AND flagged = FALSE))) THEN
    RAISE EXCEPTION 'not found';
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.moment_interactions WHERE moment_id = p_moment_id AND user_id = auth.uid() AND kind = p_kind) INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.moment_interactions WHERE moment_id = p_moment_id AND user_id = auth.uid() AND kind = p_kind;
    v_delta := -1;
  ELSE
    INSERT INTO public.moment_interactions (moment_id, user_id, kind) VALUES (p_moment_id, auth.uid(), p_kind);
    v_delta := 1;
  END IF;

  UPDATE public.soi_moments SET
    resonance_count = GREATEST(resonance_count + CASE WHEN p_kind = 'resonance' THEN v_delta ELSE 0 END, 0),
    save_count = GREATEST(save_count + CASE WHEN p_kind = 'save' THEN v_delta ELSE 0 END, 0)
  WHERE id = p_moment_id RETURNING * INTO v_row;

  RETURN jsonb_build_object('active', NOT v_exists, 'resonance', v_row.resonance_count, 'saves', v_row.save_count);
END;
$$;

-- Implementar un Blueprint (con su versión adaptada). Premium exige compra o ser el creador.
CREATE OR REPLACE FUNCTION public.implement_blueprint(
  p_blueprint_id UUID, p_adapted_steps JSONB, p_adapted_minutes INTEGER, p_note TEXT
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_bp public.soi_blueprints%ROWTYPE; v_id UUID; v_new BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_bp FROM public.soi_blueprints WHERE id = p_blueprint_id;
  IF v_bp.id IS NULL OR (v_bp.status <> 'published' AND v_bp.creator_id <> auth.uid()) THEN RAISE EXCEPTION 'not found'; END IF;
  IF v_bp.tier = 'premium' AND v_bp.creator_id <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.blueprint_purchases WHERE blueprint_id = p_blueprint_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'purchase_required'; END IF;

  SELECT NOT EXISTS (SELECT 1 FROM public.blueprint_implementations WHERE user_id = auth.uid() AND blueprint_id = p_blueprint_id) INTO v_new;

  INSERT INTO public.blueprint_implementations (user_id, blueprint_id, adapted_steps, adapted_minutes, adaptation_note)
  VALUES (auth.uid(), p_blueprint_id, COALESCE(p_adapted_steps, v_bp.steps), p_adapted_minutes, LEFT(p_note, 500))
  ON CONFLICT (user_id, blueprint_id) DO UPDATE
    SET adapted_steps = EXCLUDED.adapted_steps, adapted_minutes = EXCLUDED.adapted_minutes,
        adaptation_note = EXCLUDED.adaptation_note, status = 'active', last_activity_at = NOW()
  RETURNING id INTO v_id;

  IF v_new AND v_bp.creator_id <> auth.uid() THEN
    UPDATE public.soi_blueprints SET implementations_count = implementations_count + 1 WHERE id = p_blueprint_id;
  END IF;
  RETURN v_id;
END;
$$;

-- Marcar un paso de una implementación. Completar todos los pasos cuenta para el creador.
CREATE OR REPLACE FUNCTION public.toggle_implementation_step(p_implementation_id UUID, p_step INTEGER)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_impl public.blueprint_implementations%ROWTYPE; v_total INT; v_done INT[]; v_added BOOLEAN; v_was_completed BOOLEAN; v_creator UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_impl FROM public.blueprint_implementations WHERE id = p_implementation_id AND user_id = auth.uid() FOR UPDATE;
  IF v_impl.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  v_total := jsonb_array_length(v_impl.adapted_steps);
  IF p_step < 0 OR p_step >= v_total THEN RAISE EXCEPTION 'invalid step'; END IF;

  v_was_completed := v_impl.status = 'completed';
  IF p_step = ANY(v_impl.completed_steps) THEN
    v_done := array_remove(v_impl.completed_steps, p_step); v_added := FALSE;
  ELSE
    v_done := array_append(v_impl.completed_steps, p_step); v_added := TRUE;
  END IF;

  UPDATE public.blueprint_implementations SET
    completed_steps = v_done,
    last_activity_at = NOW(),
    status = CASE WHEN cardinality(v_done) >= v_total THEN 'completed' ELSE 'active' END,
    completed_at = CASE WHEN cardinality(v_done) >= v_total THEN COALESCE(completed_at, NOW()) ELSE NULL END
  WHERE id = p_implementation_id;

  SELECT creator_id INTO v_creator FROM public.soi_blueprints WHERE id = v_impl.blueprint_id;
  IF v_creator <> auth.uid() THEN
    UPDATE public.soi_blueprints SET
      steps_completed_count = GREATEST(steps_completed_count + CASE WHEN v_added THEN 1 ELSE -1 END, 0),
      completions_count = GREATEST(completions_count
        + CASE WHEN NOT v_was_completed AND cardinality(v_done) >= v_total THEN 1
               WHEN v_was_completed AND cardinality(v_done) < v_total THEN -1 ELSE 0 END, 0)
    WHERE id = v_impl.blueprint_id;
  END IF;

  RETURN jsonb_build_object('completed_steps', to_jsonb(v_done), 'total', v_total, 'completed', cardinality(v_done) >= v_total, 'added', v_added);
END;
$$;

-- Resultado reportado al completar (evidencia para el Transformation Score del creador).
CREATE OR REPLACE FUNCTION public.set_implementation_result(p_implementation_id UUID, p_note TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.blueprint_implementations
  SET result_note = NULLIF(LEFT(TRIM(p_note), 1000), ''), last_activity_at = NOW()
  WHERE id = p_implementation_id AND user_id = auth.uid() AND status = 'completed';
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
END;
$$;

-- Tendencias: los protocolos que más vidas están cambiando (implementaciones recientes), no los más vistos.
CREATE OR REPLACE FUNCTION public.trending_blueprints(p_days INTEGER DEFAULT 7, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (blueprint_id UUID, recent_implementations BIGINT, recent_completions BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id,
         COUNT(i.id) FILTER (WHERE i.started_at > NOW() - make_interval(days => p_days)),
         COUNT(i.id) FILTER (WHERE i.completed_at > NOW() - make_interval(days => p_days))
  FROM public.soi_blueprints b
  LEFT JOIN public.blueprint_implementations i ON i.blueprint_id = b.id
  WHERE b.status = 'published'
  GROUP BY b.id
  ORDER BY 2 DESC, b.completions_count DESC, b.implementations_count DESC
  LIMIT LEAST(p_limit, 50);
$$;

-- Métricas agregadas del creador (sin exponer quién implementó).
CREATE OR REPLACE FUNCTION public.creator_stats(p_creator UUID)
RETURNS TABLE (implementations BIGINT, completions BIGINT, active_last_14d BIGINT, results_reported BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(i.id),
         COUNT(i.id) FILTER (WHERE i.status = 'completed'),
         COUNT(i.id) FILTER (WHERE i.last_activity_at > NOW() - INTERVAL '14 days'),
         COUNT(i.id) FILTER (WHERE i.result_note IS NOT NULL AND char_length(i.result_note) > 0)
  FROM public.soi_blueprints b
  JOIN public.blueprint_implementations i ON i.blueprint_id = b.id AND i.user_id <> b.creator_id
  WHERE b.creator_id = p_creator AND b.status = 'published';
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_moment_interaction(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.implement_blueprint(UUID, JSONB, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_implementation_step(UUID, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_implementation_result(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_moment_interaction(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.implement_blueprint(UUID, JSONB, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_implementation_step(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_implementation_result(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trending_blueprints(INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.creator_stats(UUID) TO anon, authenticated;
