-- =====================================================
-- 0010 — Aditiva. Impulso tipo Substack Home, retos de varios días y medios (imágenes y audio).
--  • Publicaciones (soi_posts): texto, hasta 4 imágenes y un SOI Moment incrustado como componente.
--    Comentarios en hilo, restacks (con o sin cita), me gusta, guardados, seguir, reportes y actividad.
--  • Las publicaciones solo se crean desde el servidor (service role) tras moderación: el cliente no puede
--    saltarse las reglas de la comunidad insertando directo.
--  • Retos: inscripción y progreso día a día (challenge_enrollments).
--  • Storage: post-media (público), moment-assets (público, audios de creadores), run-media (privado).
-- =====================================================

-- ---------- Storage ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('post-media', 'post-media', TRUE, 8388608, ARRAY['image/webp', 'image/jpeg', 'image/png']),
  ('moment-assets', 'moment-assets', TRUE, 26214400, ARRAY['audio/mpeg', 'audio/mp4', 'audio/webm', 'audio/ogg', 'audio/wav', 'image/webp', 'image/jpeg', 'image/png']),
  ('run-media', 'run-media', FALSE, 26214400, ARRAY['image/webp', 'image/jpeg', 'image/png', 'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'])
ON CONFLICT (id) DO NOTHING;

-- Cada persona escribe solo en su carpeta (<user_id>/...). run-media además solo se lee por su dueño.
DROP POLICY IF EXISTS "soi_media_insert_own" ON storage.objects;
CREATE POLICY "soi_media_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('post-media', 'moment-assets', 'run-media') AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "soi_media_delete_own" ON storage.objects;
CREATE POLICY "soi_media_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('post-media', 'moment-assets', 'run-media') AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "soi_run_media_select_own" ON storage.objects;
CREATE POLICY "soi_run_media_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'run-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Perfiles públicos (solo campos públicos; user_profiles sigue siendo privado) ----------
CREATE OR REPLACE FUNCTION public.get_public_profiles(p_ids UUID[])
RETURNS TABLE (user_id UUID, display_name TEXT, avatar_url TEXT, handle TEXT, is_verified BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, COALESCE(c.display_name, p.display_name, 'Alguien de SOI'), COALESCE(c.avatar_url, p.avatar_url), c.handle, COALESCE(c.is_verified, FALSE)
  FROM public.user_profiles p LEFT JOIN public.creator_profiles c ON c.user_id = p.user_id
  WHERE p.user_id = ANY(p_ids[1:200]);
$$;

-- ---------- Publicaciones ----------
CREATE TABLE IF NOT EXISTS public.soi_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT CHECK (char_length(body) <= 3000),
  images TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(images) <= 4),
  moment_id UUID REFERENCES public.soi_blueprints(id) ON DELETE SET NULL,
  moment_slug TEXT,
  quote_of UUID REFERENCES public.soi_posts(id) ON DELETE SET NULL,
  restack_of UUID REFERENCES public.soi_posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.soi_posts(id) ON DELETE CASCADE,
  root_id UUID REFERENCES public.soi_posts(id) ON DELETE CASCADE,
  like_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  restack_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  is_demo BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (COALESCE(char_length(body), 0) > 0 OR cardinality(images) > 0 OR moment_id IS NOT NULL OR moment_slug IS NOT NULL OR restack_of IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_posts_feed ON public.soi_posts (created_at DESC) WHERE parent_id IS NULL AND flagged = FALSE;
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.soi_posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_parent ON public.soi_posts (parent_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_restack ON public.soi_posts (restack_of);
-- Un restack puro por persona y publicación.
CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_restack ON public.soi_posts (author_id, restack_of) WHERE restack_of IS NOT NULL AND body IS NULL;

CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID NOT NULL REFERENCES public.soi_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.post_saves (
  post_id UUID NOT NULL REFERENCES public.soi_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.post_reports (
  post_id UUID NOT NULL REFERENCES public.soi_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT CHECK (char_length(reason) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_followee ON public.follows (followee_id);
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('like', 'reply', 'restack', 'quote', 'follow')),
  post_id UUID REFERENCES public.soi_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id, created_at DESC);

ALTER TABLE public.soi_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select" ON public.soi_posts;
CREATE POLICY "posts_select" ON public.soi_posts FOR SELECT USING (auth.uid() IS NOT NULL AND (flagged = FALSE OR auth.uid() = author_id));
DROP POLICY IF EXISTS "posts_delete_own" ON public.soi_posts;
CREATE POLICY "posts_delete_own" ON public.soi_posts FOR DELETE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "likes_select_own" ON public.post_likes;
CREATE POLICY "likes_select_own" ON public.post_likes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "saves_select_own" ON public.post_saves;
CREATE POLICY "saves_select_own" ON public.post_saves FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "follows_select" ON public.follows;
CREATE POLICY "follows_select" ON public.follows FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "notif_select_own" ON public.notifications;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- Escrituras: publicaciones solo desde el servidor; interacciones solo vía RPC (contadores y actividad consistentes).
REVOKE INSERT, UPDATE ON public.soi_posts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.post_likes, public.post_saves, public.post_reports, public.follows, public.notifications FROM anon, authenticated;

-- Contadores y actividad al crear o borrar publicaciones.
CREATE OR REPLACE FUNCTION public.posts_after_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_target UUID; v_owner UUID; v_kind TEXT; v_delta INT := CASE WHEN TG_OP = 'INSERT' THEN 1 ELSE -1 END; r public.soi_posts%ROWTYPE;
BEGIN
  r := CASE WHEN TG_OP = 'INSERT' THEN NEW ELSE OLD END;
  IF r.parent_id IS NOT NULL THEN
    UPDATE public.soi_posts SET reply_count = GREATEST(reply_count + v_delta, 0) WHERE id = r.parent_id;
    v_target := r.parent_id; v_kind := 'reply';
  ELSIF r.restack_of IS NOT NULL THEN
    UPDATE public.soi_posts SET restack_count = GREATEST(restack_count + v_delta, 0) WHERE id = r.restack_of;
    v_target := r.restack_of; v_kind := 'restack';
  ELSIF r.quote_of IS NOT NULL THEN
    UPDATE public.soi_posts SET restack_count = GREATEST(restack_count + v_delta, 0) WHERE id = r.quote_of;
    v_target := r.quote_of; v_kind := 'quote';
  END IF;
  IF TG_OP = 'INSERT' AND v_target IS NOT NULL THEN
    SELECT author_id INTO v_owner FROM public.soi_posts WHERE id = v_target;
    IF v_owner IS NOT NULL AND v_owner <> r.author_id THEN
      INSERT INTO public.notifications (user_id, actor_id, kind, post_id) VALUES (v_owner, r.author_id, v_kind, r.id);
    END IF;
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_posts_after_change ON public.soi_posts;
CREATE TRIGGER trg_posts_after_change AFTER INSERT OR DELETE ON public.soi_posts
  FOR EACH ROW EXECUTE FUNCTION public.posts_after_change();

CREATE OR REPLACE FUNCTION public.toggle_post_like(p_post UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exists BOOLEAN; v_owner UUID; v_count INT;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT author_id INTO v_owner FROM public.soi_posts WHERE id = p_post AND flagged = FALSE;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.post_likes WHERE post_id = p_post AND user_id = auth.uid()) INTO v_exists;
  IF v_exists THEN
    DELETE FROM public.post_likes WHERE post_id = p_post AND user_id = auth.uid();
  ELSE
    INSERT INTO public.post_likes (post_id, user_id) VALUES (p_post, auth.uid());
    IF v_owner <> auth.uid() AND NOT EXISTS (
      SELECT 1 FROM public.notifications WHERE user_id = v_owner AND actor_id = auth.uid() AND kind = 'like' AND post_id = p_post
    ) THEN
      INSERT INTO public.notifications (user_id, actor_id, kind, post_id) VALUES (v_owner, auth.uid(), 'like', p_post);
    END IF;
  END IF;
  UPDATE public.soi_posts SET like_count = GREATEST(like_count + CASE WHEN v_exists THEN -1 ELSE 1 END, 0)
  WHERE id = p_post RETURNING like_count INTO v_count;
  RETURN jsonb_build_object('liked', NOT v_exists, 'count', v_count);
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_post_save(p_post UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.post_saves WHERE post_id = p_post AND user_id = auth.uid()) THEN
    DELETE FROM public.post_saves WHERE post_id = p_post AND user_id = auth.uid();
    RETURN FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.soi_posts WHERE id = p_post AND flagged = FALSE) THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.post_saves (post_id, user_id) VALUES (p_post, auth.uid());
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.toggle_follow(p_user UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user = auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.follows WHERE follower_id = auth.uid() AND followee_id = p_user) THEN
    DELETE FROM public.follows WHERE follower_id = auth.uid() AND followee_id = p_user;
    RETURN FALSE;
  END IF;
  INSERT INTO public.follows (follower_id, followee_id) VALUES (auth.uid(), p_user);
  IF NOT EXISTS (SELECT 1 FROM public.notifications WHERE user_id = p_user AND actor_id = auth.uid() AND kind = 'follow') THEN
    INSERT INTO public.notifications (user_id, actor_id, kind) VALUES (p_user, auth.uid(), 'follow');
  END IF;
  RETURN TRUE;
END;
$$;

-- Tres reportes ocultan la publicación hasta revisión.
CREATE OR REPLACE FUNCTION public.report_post(p_post UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.post_reports (post_id, user_id, reason) VALUES (p_post, auth.uid(), LEFT(p_reason, 200))
  ON CONFLICT DO NOTHING;
  IF FOUND THEN
    UPDATE public.soi_posts SET report_count = report_count + 1, flagged = (report_count + 1 >= 3) WHERE id = p_post;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read()
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications SET read_at = NOW() WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

-- "Para ti": últimos 14 días ordenados por interés con decaimiento temporal (como un "hot" de Substack Notes).
CREATE OR REPLACE FUNCTION public.feed_for_you(p_offset INTEGER DEFAULT 0, p_limit INTEGER DEFAULT 15)
RETURNS SETOF public.soi_posts LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT * FROM public.soi_posts
  WHERE parent_id IS NULL AND flagged = FALSE AND created_at > NOW() - INTERVAL '14 days'
  ORDER BY (1 + like_count * 2 + reply_count * 3 + restack_count * 3 + CASE WHEN moment_id IS NOT NULL OR moment_slug IS NOT NULL THEN 2 ELSE 0 END)
           / POWER(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 + 2, 1.4) DESC, created_at DESC
  OFFSET GREATEST(p_offset, 0) LIMIT LEAST(p_limit, 30);
$$;

-- "Siguiendo": publicaciones y restacks de quienes sigues, en orden cronológico.
CREATE OR REPLACE FUNCTION public.feed_following(p_before TIMESTAMPTZ DEFAULT NULL, p_limit INTEGER DEFAULT 15)
RETURNS SETOF public.soi_posts LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT p.* FROM public.soi_posts p
  WHERE p.parent_id IS NULL AND p.flagged = FALSE
    AND p.author_id IN (SELECT followee_id FROM public.follows WHERE follower_id = auth.uid())
    AND (p_before IS NULL OR p.created_at < p_before)
  ORDER BY p.created_at DESC LIMIT LEAST(p_limit, 30);
$$;

-- ---------- Ejecuciones de Moments oficiales (solo totales) ----------
CREATE OR REPLACE FUNCTION public.official_moment_stats()
RETURNS TABLE (slug TEXT, executions BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT moment_slug, COUNT(DISTINCT (user_id, completed_at::date))
  FROM public.moment_runs WHERE moment_slug IS NOT NULL AND completed_at IS NOT NULL
  GROUP BY moment_slug;
$$;

-- ---------- Retos de varios días ----------
-- La vista previa premium conserva el día de cada bloque (los retos lo necesitan).
CREATE OR REPLACE FUNCTION public.moment_preview(p_blocks JSONB)
RETURNS JSONB LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', b->>'id', 'type', b->>'type', 'title', b->>'title', 'minutes', b->'minutes', 'day', b->'day', 'config', '{}'::jsonb, 'redacted', TRUE
  )) ORDER BY ord), '[]'::jsonb)
  FROM jsonb_array_elements(COALESCE(p_blocks, '[]'::jsonb)) WITH ORDINALITY AS t(b, ord);
$$;

ALTER TABLE public.moment_runs ADD COLUMN IF NOT EXISTS challenge_day INTEGER CHECK (challenge_day BETWEEN 1 AND 365);

CREATE TABLE IF NOT EXISTS public.challenge_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  moment_id UUID REFERENCES public.soi_blueprints(id) ON DELETE CASCADE,
  moment_slug TEXT,
  started_on DATE NOT NULL DEFAULT CURRENT_DATE,
  completed JSONB NOT NULL DEFAULT '{}',   -- { "<día>": "<fecha YYYY-MM-DD>" }
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'left')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (moment_id IS NOT NULL OR moment_slug IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_enroll_moment ON public.challenge_enrollments (user_id, moment_id) WHERE moment_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_enroll_slug ON public.challenge_enrollments (user_id, moment_slug) WHERE moment_slug IS NOT NULL;
ALTER TABLE public.challenge_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ce_select_own" ON public.challenge_enrollments;
CREATE POLICY "ce_select_own" ON public.challenge_enrollments FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ce_insert_own" ON public.challenge_enrollments;
CREATE POLICY "ce_insert_own" ON public.challenge_enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "ce_update_own" ON public.challenge_enrollments;
CREATE POLICY "ce_update_own" ON public.challenge_enrollments FOR UPDATE USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE ON public.challenge_enrollments FROM anon, authenticated;
GRANT INSERT (user_id, moment_id, moment_slug, started_on) ON public.challenge_enrollments TO authenticated;
GRANT UPDATE (completed, status, started_on) ON public.challenge_enrollments TO authenticated;
GRANT INSERT (challenge_day) ON public.moment_runs TO authenticated;

-- ---------- Permisos de RPC ----------
REVOKE EXECUTE ON FUNCTION public.toggle_post_like(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_post_save(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_follow(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_post(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_notifications_read() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles(UUID[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.posts_after_change() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_post_like(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_post_save(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_follow(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_post(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.official_moment_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.feed_for_you(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feed_following(TIMESTAMPTZ, INTEGER) TO authenticated;

-- ---------- Compartir un Moment en Impulso ----------
-- Un Moment propio adjunto a una publicación (no oculta) de su creador queda visible y "guardable como versión"
-- para quien vea la publicación. Borrar la publicación lo vuelve privado. Premium sigue exigiendo compra.
CREATE OR REPLACE FUNCTION public.is_shared_moment(p_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.soi_posts p JOIN public.soi_blueprints b ON b.id = p.moment_id
    WHERE p.moment_id = p_id AND p.author_id = b.creator_id AND p.flagged = FALSE AND b.status <> 'archived'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_shared_moment(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "bp_select" ON public.soi_blueprints;
CREATE POLICY "bp_select" ON public.soi_blueprints FOR SELECT
  USING (status = 'published' OR auth.uid() = creator_id OR (auth.uid() IS NOT NULL AND public.is_shared_moment(id)));

CREATE OR REPLACE FUNCTION public.get_moment_blocks(p_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.soi_blueprints%ROWTYPE;
BEGIN
  SELECT * INTO v FROM public.soi_blueprints WHERE id = p_id;
  IF v.id IS NULL THEN RETURN NULL; END IF;
  IF v.status <> 'published' AND v.creator_id IS DISTINCT FROM auth.uid() AND NOT public.is_shared_moment(p_id) THEN RETURN NULL; END IF;
  IF v.tier = 'free' THEN RETURN v.blocks; END IF;
  IF v.creator_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.blueprint_purchases WHERE blueprint_id = p_id AND user_id = auth.uid()
  ) THEN RETURN COALESCE(v.premium_blocks, v.blocks); END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fork_moment(p_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.soi_blueprints%ROWTYPE; v_existing UUID; v_new UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v FROM public.soi_blueprints WHERE id = p_id;
  IF v.id IS NULL OR (v.status <> 'published' AND v.creator_id <> auth.uid() AND NOT public.is_shared_moment(p_id)) THEN RAISE EXCEPTION 'not found'; END IF;
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
