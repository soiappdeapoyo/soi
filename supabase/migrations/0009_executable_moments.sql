-- =====================================================
-- 0009 — Aditiva. El SOI Moment como flujo ejecutable.
--  • La tabla soi_blueprints pasa a guardar los Moments ejecutables (en la interfaz ya no existe "Blueprint").
--    La tabla soi_moments guarda las Ideas. No se renombran tablas (Regla de Oro #7).
--  • Un Moment = bloques de acción (blocks) con intención, objetivo y resultado esperado.
--  • Cualquiera crea Moments privados; publicar exige perfil de creador.
--  • Premium: el contenido completo vive en premium_blocks (sin permiso de lectura) y solo se entrega
--    por RPC al dueño o a quien lo compró. El público ve una vista previa (títulos y minutos).
--  • Ejecuciones (moment_runs), historial de versiones (moment_versions) y contadores solo vía RPC.
-- =====================================================

-- ---------- Moments: columnas nuevas ----------
ALTER TABLE public.soi_blueprints ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'growth';
ALTER TABLE public.soi_blueprints ADD COLUMN IF NOT EXISTS blocks JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.soi_blueprints ADD COLUMN IF NOT EXISTS premium_blocks JSONB;
ALTER TABLE public.soi_blueprints ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.soi_blueprints(id) ON DELETE SET NULL;
ALTER TABLE public.soi_blueprints ADD COLUMN IF NOT EXISTS parent_slug TEXT;
ALTER TABLE public.soi_blueprints ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.soi_blueprints ADD COLUMN IF NOT EXISTS executions_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.soi_blueprints ADD COLUMN IF NOT EXISTS forks_count INTEGER NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.soi_blueprints ADD CONSTRAINT soi_blueprints_kind_check
    CHECK (kind IN ('daily', 'recovery', 'growth', 'learning', 'challenge', 'community'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 'private' = copia personal (fork) o Moment creado por la IA para una persona.
ALTER TABLE public.soi_blueprints DROP CONSTRAINT IF EXISTS soi_blueprints_status_check;
ALTER TABLE public.soi_blueprints ADD CONSTRAINT soi_blueprints_status_check
  CHECK (status IN ('private', 'draft', 'published', 'archived'));

CREATE INDEX IF NOT EXISTS idx_bp_parent ON public.soi_blueprints (parent_id);
CREATE INDEX IF NOT EXISTS idx_bp_kind ON public.soi_blueprints (status, kind, created_at DESC);

-- ---------- Bloques: normalización, vista previa premium y compatibilidad con steps ----------
-- Un bloque: { id, type, title, minutes, config, source? }. "steps" (formato anterior) se deriva de blocks.
CREATE OR REPLACE FUNCTION public.moment_blocks_from_steps(p_steps JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', 'b' || ord,
    'type', 'timer',
    'title', s->>'title',
    'minutes', GREATEST(1, COALESCE((s->>'minutes')::INT, 5)),
    'config', jsonb_build_object('instruction', COALESCE(s->>'detail', s->>'title'))
  ) ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_steps, '[]'::jsonb)) WITH ORDINALITY AS t(s, ord);
$$;

CREATE OR REPLACE FUNCTION public.moment_preview(p_blocks JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', b->>'id', 'type', b->>'type', 'title', b->>'title', 'minutes', b->'minutes', 'config', '{}'::jsonb, 'redacted', TRUE
  ) ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_blocks, '[]'::jsonb)) WITH ORDINALITY AS t(b, ord);
$$;

CREATE OR REPLACE FUNCTION public.moment_normalize()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_full JSONB; v_minutes INT; v_parent_tier TEXT;
BEGIN
  -- Ruta anterior (solo steps) → bloques.
  IF jsonb_array_length(COALESCE(NEW.blocks, '[]')) = 0 AND jsonb_array_length(COALESCE(NEW.steps, '[]')) > 0 THEN
    NEW.blocks := public.moment_blocks_from_steps(NEW.steps);
  END IF;

  -- Contenido completo: si llegan bloques redactados (vista previa), se conserva el completo guardado.
  IF (NEW.blocks->0->>'redacted') IS NOT NULL AND TG_OP = 'UPDATE' THEN
    v_full := COALESCE(OLD.premium_blocks, OLD.blocks);
  ELSE
    v_full := NEW.blocks;
  END IF;

  IF NEW.tier = 'premium' THEN
    NEW.premium_blocks := v_full;
    NEW.blocks := public.moment_preview(v_full);
  ELSE
    NEW.premium_blocks := NULL;
    NEW.blocks := v_full;
  END IF;

  -- steps y minutos derivados (sin detalle en premium).
  NEW.steps := COALESCE((
    SELECT jsonb_agg(CASE WHEN NEW.tier = 'premium'
      THEN jsonb_build_object('title', b->>'title', 'minutes', GREATEST(1, COALESCE((b->>'minutes')::INT, 1)))
      ELSE jsonb_build_object('title', b->>'title', 'minutes', GREATEST(1, COALESCE((b->>'minutes')::INT, 1)), 'detail', b->'config'->>'instruction')
    END ORDER BY ord)
    FROM jsonb_array_elements(v_full) WITH ORDINALITY AS t(b, ord)
  ), '[]'::jsonb);
  SELECT COALESCE(SUM(GREATEST(1, COALESCE((b->>'minutes')::INT, 1))), 1) INTO v_minutes FROM jsonb_array_elements(v_full) b;
  NEW.required_minutes := LEAST(240, GREATEST(1, v_minutes));

  -- Un fork de un Moment premium nunca se publica (protege al creador original).
  IF NEW.status = 'published' AND NEW.parent_id IS NOT NULL THEN
    SELECT tier INTO v_parent_tier FROM public.soi_blueprints WHERE id = NEW.parent_id;
    IF v_parent_tier = 'premium' THEN RAISE EXCEPTION 'fork_of_premium'; END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_moment_normalize ON public.soi_blueprints;
CREATE TRIGGER trg_moment_normalize BEFORE INSERT OR UPDATE ON public.soi_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.moment_normalize();

-- Backfill: los Moments existentes pasan por el trigger (blocks desde steps, vista previa premium).
UPDATE public.soi_blueprints SET updated_at = NOW() WHERE jsonb_array_length(blocks) = 0;

-- ---------- RLS y permisos de Moments ----------
DROP POLICY IF EXISTS "bp_insert_creator" ON public.soi_blueprints;
DROP POLICY IF EXISTS "bp_insert" ON public.soi_blueprints;
CREATE POLICY "bp_insert" ON public.soi_blueprints FOR INSERT WITH CHECK (
  auth.uid() = creator_id
  AND (status <> 'published' OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.user_id = auth.uid()))
);
DROP POLICY IF EXISTS "bp_update_own" ON public.soi_blueprints;
CREATE POLICY "bp_update_own" ON public.soi_blueprints FOR UPDATE USING (auth.uid() = creator_id) WITH CHECK (
  auth.uid() = creator_id
  AND (status <> 'published' OR EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.user_id = auth.uid()))
);

-- premium_blocks no se lee nunca desde el cliente; contadores y versión solo vía RPC.
REVOKE SELECT ON public.soi_blueprints FROM anon, authenticated;
GRANT SELECT (
  id, creator_id, moment_id, title, objective, required_minutes, duration_days, difficulty, eslabon, target_states,
  steps, source, tier, price_cents, currency, status, implementations_count, completions_count, steps_completed_count,
  is_demo, created_at, updated_at, kind, blocks, parent_id, parent_slug, version, executions_count, forks_count
) ON public.soi_blueprints TO anon, authenticated;
GRANT INSERT (kind, blocks, parent_slug) ON public.soi_blueprints TO authenticated;
GRANT UPDATE (kind, blocks) ON public.soi_blueprints TO authenticated;

-- ---------- Ejecuciones ----------
CREATE TABLE IF NOT EXISTS public.moment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moment_id UUID REFERENCES public.soi_blueprints(id) ON DELETE SET NULL,
  moment_slug TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  mood_before SMALLINT CHECK (mood_before BETWEEN 1 AND 5),
  mood_after SMALLINT CHECK (mood_after BETWEEN 1 AND 5),
  outputs JSONB NOT NULL DEFAULT '{}',
  learning TEXT CHECK (char_length(learning) <= 1000),
  helped BOOLEAN,
  counted BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (moment_id IS NOT NULL OR moment_slug IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_runs_user ON public.moment_runs (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_moment ON public.moment_runs (moment_id, completed_at DESC);

ALTER TABLE public.moment_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mr_select_own" ON public.moment_runs;
CREATE POLICY "mr_select_own" ON public.moment_runs FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "mr_insert_own" ON public.moment_runs;
CREATE POLICY "mr_insert_own" ON public.moment_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "mr_update_own" ON public.moment_runs;
CREATE POLICY "mr_update_own" ON public.moment_runs FOR UPDATE USING (auth.uid() = user_id AND completed_at IS NULL);

REVOKE INSERT, UPDATE, DELETE ON public.moment_runs FROM anon, authenticated;
GRANT INSERT (user_id, moment_id, moment_slug, version, mood_before, outputs) ON public.moment_runs TO authenticated;
GRANT UPDATE (outputs) ON public.moment_runs TO authenticated;

-- ---------- Historial de versiones ----------
CREATE TABLE IF NOT EXISTS public.moment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moment_id UUID NOT NULL REFERENCES public.soi_blueprints(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  blocks JSONB NOT NULL,
  note TEXT CHECK (char_length(note) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (moment_id, version)
);
ALTER TABLE public.moment_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mv_select_own" ON public.moment_versions;
CREATE POLICY "mv_select_own" ON public.moment_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.soi_blueprints b WHERE b.id = moment_versions.moment_id AND b.creator_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.moment_versions FROM anon, authenticated;

-- Momentum: completar un Moment.
ALTER TABLE public.momentum_events DROP CONSTRAINT IF EXISTS momentum_events_kind_check;
ALTER TABLE public.momentum_events ADD CONSTRAINT momentum_events_kind_check CHECK (kind IN (
  'return', 'action_completed', 'ritual_completed', 'routine_completed', 'evidence_saved',
  'reflection', 'goal_set', 'blueprint_implemented', 'blueprint_step', 'blueprint_completed',
  'video_watched', 'checkin', 'moment_completed'
));

-- =====================================================
-- RPC
-- =====================================================

-- Bloques completos de un Moment: libre → todos; premium → dueño o comprador; si no, NULL.
CREATE OR REPLACE FUNCTION public.get_moment_blocks(p_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.soi_blueprints%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.soi_blueprints WHERE id = p_id;
  IF v.id IS NULL THEN RETURN NULL; END IF;
  IF v.status NOT IN ('published') AND v.creator_id IS DISTINCT FROM auth.uid() THEN RETURN NULL; END IF;
  IF v.tier = 'free' THEN RETURN v.blocks; END IF;
  IF v.creator_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.blueprint_purchases WHERE blueprint_id = p_id AND user_id = auth.uid()
  ) THEN RETURN COALESCE(v.premium_blocks, v.blocks); END IF;
  RETURN NULL;
END;
$$;

-- Duplicar ("guardar mi versión"). Premium exige compra. Si ya existe una copia propia, la devuelve.
CREATE OR REPLACE FUNCTION public.fork_moment(p_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.soi_blueprints%ROWTYPE; v_existing UUID; v_new UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v FROM public.soi_blueprints WHERE id = p_id;
  IF v.id IS NULL OR (v.status <> 'published' AND v.creator_id <> auth.uid()) THEN RAISE EXCEPTION 'not found'; END IF;
  IF v.tier = 'premium' AND v.creator_id <> auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.blueprint_purchases WHERE blueprint_id = p_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'purchase_required'; END IF;

  SELECT id INTO v_existing FROM public.soi_blueprints
  WHERE parent_id = p_id AND creator_id = auth.uid() AND status <> 'archived'
  ORDER BY created_at DESC LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  INSERT INTO public.soi_blueprints (creator_id, title, objective, required_minutes, duration_days, difficulty, eslabon,
    target_states, steps, source, tier, price_cents, status, kind, blocks, parent_id)
  VALUES (auth.uid(), v.title, v.objective, v.required_minutes, v.duration_days, v.difficulty, v.eslabon,
    v.target_states, '[]', v.source, 'free', 0, 'private', v.kind, COALESCE(v.premium_blocks, v.blocks), p_id)
  RETURNING id INTO v_new;

  IF v.creator_id <> auth.uid() THEN
    UPDATE public.soi_blueprints SET forks_count = forks_count + 1 WHERE id = p_id;
  END IF;
  RETURN v_new;
END;
$$;

-- Cerrar una ejecución. Cuenta para el creador como máximo una vez por persona, Moment y día.
CREATE OR REPLACE FUNCTION public.complete_moment_run(p_run_id UUID, p_mood_after SMALLINT, p_learning TEXT, p_helped BOOLEAN)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.moment_runs%ROWTYPE; v_creator UUID; v_tier TEXT; v_count BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO r FROM public.moment_runs WHERE id = p_run_id AND user_id = auth.uid() FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF r.completed_at IS NOT NULL THEN RETURN jsonb_build_object('already', TRUE); END IF;

  IF r.moment_id IS NOT NULL THEN
    SELECT creator_id, tier INTO v_creator, v_tier FROM public.soi_blueprints WHERE id = r.moment_id;
    -- Solo cuenta si es gratis o fue comprado: un premium no comprado nunca suma ejecuciones.
    v_count := v_creator IS DISTINCT FROM auth.uid()
      AND (v_tier = 'free' OR EXISTS (SELECT 1 FROM public.blueprint_purchases WHERE blueprint_id = r.moment_id AND user_id = auth.uid()))
      AND NOT EXISTS (
      SELECT 1 FROM public.moment_runs WHERE user_id = auth.uid() AND moment_id = r.moment_id AND counted
        AND completed_at > NOW() - INTERVAL '1 day'
    );
  END IF;

  UPDATE public.moment_runs SET completed_at = NOW(),
    mood_after = CASE WHEN p_mood_after BETWEEN 1 AND 5 THEN p_mood_after END,
    learning = NULLIF(LEFT(TRIM(COALESCE(p_learning, '')), 1000), ''),
    helped = p_helped, counted = v_count
  WHERE id = p_run_id;

  IF v_count THEN
    UPDATE public.soi_blueprints SET executions_count = executions_count + 1 WHERE id = r.moment_id;
  END IF;
  RETURN jsonb_build_object('already', FALSE, 'counted', v_count);
END;
$$;

-- Aceptar la mejor versión (solo Moments propios). Guarda la anterior en el historial.
CREATE OR REPLACE FUNCTION public.save_moment_version(p_id UUID, p_blocks JSONB, p_note TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.soi_blueprints%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v FROM public.soi_blueprints WHERE id = p_id AND creator_id = auth.uid() FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF jsonb_typeof(p_blocks) <> 'array' OR jsonb_array_length(p_blocks) = 0 THEN RAISE EXCEPTION 'invalid blocks'; END IF;

  INSERT INTO public.moment_versions (moment_id, version, blocks, note)
  VALUES (p_id, v.version, COALESCE(v.premium_blocks, v.blocks), LEFT(p_note, 500))
  ON CONFLICT (moment_id, version) DO NOTHING;

  UPDATE public.soi_blueprints SET blocks = p_blocks, version = v.version + 1, updated_at = NOW() WHERE id = p_id;
  RETURN v.version + 1;
END;
$$;

-- Tendencias: ejecuciones recientes (no vistas). Mantiene las columnas de salida de 0007.
CREATE OR REPLACE FUNCTION public.trending_blueprints(p_days INTEGER DEFAULT 7, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (blueprint_id UUID, recent_implementations BIGINT, recent_completions BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id,
         (SELECT COUNT(*) FROM public.moment_runs r WHERE r.moment_id = b.id AND r.counted
            AND r.completed_at > NOW() - make_interval(days => p_days))
       + (SELECT COUNT(*) FROM public.blueprint_implementations i WHERE i.blueprint_id = b.id
            AND i.started_at > NOW() - make_interval(days => p_days)),
         (SELECT COUNT(*) FROM public.moment_runs r WHERE r.moment_id = b.id AND r.helped
            AND r.completed_at > NOW() - make_interval(days => p_days))
  FROM public.soi_blueprints b
  WHERE b.status = 'published'
  ORDER BY 2 DESC, b.executions_count DESC, b.implementations_count DESC
  LIMIT LEAST(p_limit, 50);
$$;

-- Métricas del creador: personas que adoptaron sus Moments (fork, implementación o ejecución), completitud,
-- actividad reciente y resultados reportados. Sin exponer quién.
CREATE OR REPLACE FUNCTION public.creator_stats(p_creator UUID)
RETURNS TABLE (implementations BIGINT, completions BIGINT, active_last_14d BIGINT, results_reported BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH mine AS (SELECT id FROM public.soi_blueprints WHERE creator_id = p_creator AND status = 'published'),
  runs AS (SELECT r.* FROM public.moment_runs r JOIN mine m ON m.id = r.moment_id WHERE r.user_id <> p_creator),
  impls AS (SELECT i.* FROM public.blueprint_implementations i JOIN mine m ON m.id = i.blueprint_id WHERE i.user_id <> p_creator),
  forks AS (SELECT f.creator_id AS user_id FROM public.soi_blueprints f JOIN mine m ON m.id = f.parent_id WHERE f.creator_id <> p_creator),
  adopters AS (
    SELECT user_id FROM runs UNION SELECT user_id FROM impls UNION SELECT user_id FROM forks
  )
  SELECT
    (SELECT COUNT(*) FROM adopters),
    (SELECT COUNT(*) FROM runs WHERE completed_at IS NOT NULL) + (SELECT COUNT(*) FROM impls WHERE status = 'completed'),
    (SELECT COUNT(DISTINCT user_id) FROM (
      SELECT user_id FROM runs WHERE started_at > NOW() - INTERVAL '14 days'
      UNION SELECT user_id FROM impls WHERE last_activity_at > NOW() - INTERVAL '14 days') a),
    (SELECT COUNT(*) FROM runs WHERE learning IS NOT NULL OR (mood_after > mood_before))
      + (SELECT COUNT(*) FROM impls WHERE result_note IS NOT NULL AND char_length(result_note) > 0);
$$;

REVOKE EXECUTE ON FUNCTION public.get_moment_blocks(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fork_moment(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.complete_moment_run(UUID, SMALLINT, TEXT, BOOLEAN) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_moment_version(UUID, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_moment_blocks(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fork_moment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_moment_run(UUID, SMALLINT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_moment_version(UUID, JSONB, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.moment_normalize() FROM PUBLIC, anon, authenticated;
