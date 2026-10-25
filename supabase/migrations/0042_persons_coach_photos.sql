-- /persons: el coach como conversación y las fotos.
--  - persona_coach_messages: el chat con el coach de cada personaje (lo que la persona le pregunta, sus respuestas, las
--    ideas que va dejando mientras practicas y el feedback de cada sesión como tarjeta). Solo escribe el servidor.
--  - personas.avatar_path / avatar_source / avatar_at: foto de perfil generada con IA (o, de respaldo, una foto libre
--    de derechos sin personas); vive en moment-assets/<user_id>/persons/ para que se borre con la cuenta.
--  - personas.coach_read_at: hasta dónde leyó lo del coach (el aviso «tu coach tiene una idea» en el chat).

ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS avatar_path TEXT;
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS avatar_source TEXT;
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS avatar_at TIMESTAMPTZ;
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS coach_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
DO $$ BEGIN
  ALTER TABLE public.personas ADD CONSTRAINT personas_avatar_source_check CHECK (avatar_source IS NULL OR avatar_source IN ('ai', 'web', 'none'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.persona_coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'coach')),
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'tip', 'report')),
  content TEXT NOT NULL CHECK (char_length(content) <= 2000),
  -- Hasta qué mensaje de la práctica miró el coach (las ideas nuevas solo hablan de lo que pasó después).
  upto_at TIMESTAMPTZ,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_persona_coach_messages ON public.persona_coach_messages (persona_id, created_at);

ALTER TABLE public.persona_coach_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "persona_coach_messages_select_own" ON public.persona_coach_messages;
CREATE POLICY "persona_coach_messages_select_own" ON public.persona_coach_messages FOR SELECT USING (auth.uid() = user_id);
REVOKE ALL ON public.persona_coach_messages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.persona_coach_messages FROM authenticated;
