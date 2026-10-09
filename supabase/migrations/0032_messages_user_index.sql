-- =====================================================
-- 0032 — Aditiva. Índice para el loop principal (src/lib/journey-server.ts): cuántos mensajes escribió la
-- persona y si escribió después de su primer Moment, sin recorrer la tabla de mensajes por conversación.
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_msg_user_role ON public.messages (user_id, created_at DESC) WHERE role = 'user';
