-- =====================================================
-- 0011 — Aditiva. Mensajes directos (1 a 1) y edición de publicaciones.
--  • Consentimiento: solo puedes escribirle a quien te sigue, o en una conversación donde esa persona ya respondió.
--  • Bloqueos en ambas direcciones; reportes de mensajes.
--  • Los mensajes se insertan solo desde el servidor (service role) tras filtros; las personas solo leen sus hilos.
--  • Tiempo real con Supabase Realtime (respeta RLS).
--  • Publicaciones editables: edited_at y historial de revisiones (para moderación).
-- =====================================================

-- ---------- Mensajes directos ----------
CREATE TABLE IF NOT EXISTS public.dm_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT,
  CHECK (user_a < user_b),
  UNIQUE (user_a, user_b)
);
CREATE INDEX IF NOT EXISTS idx_dm_threads_a ON public.dm_threads (user_a, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_dm_threads_b ON public.dm_threads (user_b, last_message_at DESC);

CREATE TABLE IF NOT EXISTS public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT CHECK (char_length(body) <= 2000),
  post_id UUID REFERENCES public.soi_posts(id) ON DELETE SET NULL,
  moment_id UUID REFERENCES public.soi_blueprints(id) ON DELETE SET NULL,
  moment_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CHECK (COALESCE(char_length(body), 0) > 0 OR post_id IS NOT NULL OR moment_id IS NOT NULL OR moment_slug IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_dm_messages_thread ON public.dm_messages (thread_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dm_reads (
  thread_id UUID NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (thread_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.dm_reports (
  message_id UUID NOT NULL REFERENCES public.dm_messages(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT CHECK (char_length(reason) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, reporter_id)
);

ALTER TABLE public.dm_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dmt_select_member" ON public.dm_threads;
CREATE POLICY "dmt_select_member" ON public.dm_threads FOR SELECT USING (auth.uid() IN (user_a, user_b));
DROP POLICY IF EXISTS "dmm_select_member" ON public.dm_messages;
CREATE POLICY "dmm_select_member" ON public.dm_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.dm_threads t WHERE t.id = dm_messages.thread_id AND auth.uid() IN (t.user_a, t.user_b)));
DROP POLICY IF EXISTS "dmr_select_own" ON public.dm_reads;
CREATE POLICY "dmr_select_own" ON public.dm_reads FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ub_select_own" ON public.user_blocks;
CREATE POLICY "ub_select_own" ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id);

REVOKE INSERT, UPDATE, DELETE ON public.dm_threads, public.dm_messages, public.dm_reads, public.user_blocks, public.dm_reports FROM anon, authenticated;

-- ¿Puede p_sender escribirle a p_recipient? Sin bloqueos y con consentimiento.
CREATE OR REPLACE FUNCTION public.can_message(p_sender UUID, p_recipient UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_sender <> p_recipient
    AND NOT EXISTS (SELECT 1 FROM public.user_blocks WHERE (blocker_id = p_recipient AND blocked_id = p_sender) OR (blocker_id = p_sender AND blocked_id = p_recipient))
    AND (
      EXISTS (SELECT 1 FROM public.follows WHERE follower_id = p_recipient AND followee_id = p_sender)
      OR EXISTS (
        SELECT 1 FROM public.dm_threads t JOIN public.dm_messages m ON m.thread_id = t.id
        WHERE t.user_a = LEAST(p_sender, p_recipient) AND t.user_b = GREATEST(p_sender, p_recipient) AND m.sender_id = p_recipient
      )
    );
$$;

-- Marca como leída una conversación propia.
CREATE OR REPLACE FUNCTION public.mark_dm_read(p_thread UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.dm_threads WHERE id = p_thread AND auth.uid() IN (user_a, user_b)) THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.dm_reads (thread_id, user_id, last_read_at) VALUES (p_thread, auth.uid(), NOW())
  ON CONFLICT (thread_id, user_id) DO UPDATE SET last_read_at = NOW();
END;
$$;

-- Conversaciones con mensajes sin leer (para el contador del ícono).
CREATE OR REPLACE FUNCTION public.dm_unread_threads()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::INT FROM public.dm_threads t
  LEFT JOIN public.dm_reads r ON r.thread_id = t.id AND r.user_id = auth.uid()
  WHERE auth.uid() IN (t.user_a, t.user_b)
    AND EXISTS (SELECT 1 FROM public.dm_messages m WHERE m.thread_id = t.id AND m.sender_id <> auth.uid() AND m.deleted_at IS NULL
                AND m.created_at > COALESCE(r.last_read_at, 'epoch'::timestamptz));
$$;

CREATE OR REPLACE FUNCTION public.toggle_block(p_user UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user = auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.user_blocks WHERE blocker_id = auth.uid() AND blocked_id = p_user) THEN
    DELETE FROM public.user_blocks WHERE blocker_id = auth.uid() AND blocked_id = p_user;
    RETURN FALSE;
  END IF;
  INSERT INTO public.user_blocks (blocker_id, blocked_id) VALUES (auth.uid(), p_user);
  -- Bloquear también deja de seguir en ambas direcciones.
  DELETE FROM public.follows WHERE (follower_id = auth.uid() AND followee_id = p_user) OR (follower_id = p_user AND followee_id = auth.uid());
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_dm(p_message UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.dm_messages m JOIN public.dm_threads t ON t.id = m.thread_id
    WHERE m.id = p_message AND auth.uid() IN (t.user_a, t.user_b) AND m.sender_id <> auth.uid()
  ) THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.dm_reports (message_id, reporter_id, reason) VALUES (p_message, auth.uid(), LEFT(p_reason, 200)) ON CONFLICT DO NOTHING;
END;
$$;

-- Borrar un mensaje propio (queda "Mensaje eliminado" para no romper la conversación).
CREATE OR REPLACE FUNCTION public.delete_dm(p_message UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.dm_messages SET deleted_at = NOW(), body = NULL, post_id = NULL, moment_id = NULL, moment_slug = NULL
  WHERE id = p_message AND sender_id = auth.uid() AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
END;
$$;

-- El CHECK de contenido permite mensajes eliminados.
ALTER TABLE public.dm_messages DROP CONSTRAINT IF EXISTS dm_messages_check;
ALTER TABLE public.dm_messages ADD CONSTRAINT dm_messages_check
  CHECK (deleted_at IS NOT NULL OR COALESCE(char_length(body), 0) > 0 OR post_id IS NOT NULL OR moment_id IS NOT NULL OR moment_slug IS NOT NULL);

-- Tiempo real para mensajes nuevos (Realtime aplica la política de SELECT).
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN undefined_object THEN NULL; END $$;

-- ---------- Edición de publicaciones ----------
ALTER TABLE public.soi_posts ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.post_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.soi_posts(id) ON DELETE CASCADE,
  body TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.post_revisions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prev_select_author" ON public.post_revisions;
CREATE POLICY "prev_select_author" ON public.post_revisions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.soi_posts p WHERE p.id = post_revisions.post_id AND p.author_id = auth.uid()));
REVOKE INSERT, UPDATE, DELETE ON public.post_revisions FROM anon, authenticated;

-- Los feeds devuelven SETOF soi_posts: incluyen edited_at automáticamente.

REVOKE EXECUTE ON FUNCTION public.can_message(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.mark_dm_read(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dm_unread_threads() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_block(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.report_dm(UUID, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_dm(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_message(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_dm_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dm_unread_threads() TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_block(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.report_dm(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_dm(UUID) TO authenticated;
