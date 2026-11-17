-- SOI te escribe primero (como un coach/amigo): un mensaje al día en el chat, a veces con nota de voz.
--  • conversations.proactive_at: cuándo SOI empezó esta conversación sin que la persona escribiera.
--  • conversations.unread_count: mensajes de SOI sin leer (la burbuja de la pestaña SOI). Lo pone el servidor; se
--    limpia al abrir la conversación.
--  • messages.meta: datos del mensaje (proactive, voice = nota de voz, hook, moment sugerido). Lo escribe el servidor.
--  • user_profiles.coach_messages_enabled: «SOI me escribe» en Ajustes.

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS proactive_at TIMESTAMPTZ;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS unread_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS meta JSONB;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS coach_messages_enabled BOOLEAN NOT NULL DEFAULT TRUE;
GRANT UPDATE (coach_messages_enabled) ON public.user_profiles TO authenticated;

CREATE INDEX IF NOT EXISTS conversations_unread_idx ON public.conversations (user_id) WHERE unread_count > 0;
CREATE INDEX IF NOT EXISTS conversations_proactive_idx ON public.conversations (user_id, proactive_at DESC) WHERE proactive_at IS NOT NULL;
-- Notas de voz del día (tope diario) y mensajes de SOI con meta.
CREATE INDEX IF NOT EXISTS messages_meta_user_idx ON public.messages (user_id, created_at DESC) WHERE meta IS NOT NULL;
