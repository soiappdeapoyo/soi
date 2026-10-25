-- /persons: gimnasio de conversación con personas sintéticas (estilo WhatsApp). Es otro tipo de cuenta:
--  - user_profiles.app_role: 'soi' (por defecto) o 'persons'. Lo fija solo el servidor al registrarse desde /persons/entrar.
--    Usa los mismos planes (trial / free / soi_plus) y la misma suscripción de Stripe.
--  - personas: los personajes de cada cuenta (ficha, agenda del día, temperamento y emoción actual; `spec` = PersonSpec).
--  - persona_messages: el chat. `deliver_at` en el futuro = el mensaje existe pero aún no se ve (latencia realista);
--    `read_at` = cuándo el personaje "lee" un mensaje de la persona (doble check azul).
--  - persona_debriefs: el feedback del coach al terminar una sesión.
--  - persona_generations: cada personaje generado o ajustado por descripción (cupos diarios) y cada intento bloqueado
--    (solo el motivo y un hash, nunca el texto).
-- Todo lo escribe el servidor (las reglas de emoción, agenda y cupos viven ahí); cada quien lee lo suyo.

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS app_role TEXT NOT NULL DEFAULT 'soi';
DO $$ BEGIN
  ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_app_role_check CHECK (app_role IN ('soi', 'persons'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preset_id TEXT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  age SMALLINT NOT NULL CHECK (age BETWEEN 18 AND 99),
  gender TEXT NOT NULL CHECK (gender IN ('femenino', 'masculino', 'no_binario')),
  profession TEXT NOT NULL CHECK (char_length(profession) <= 80),
  city TEXT NOT NULL CHECK (char_length(city) <= 60),
  bio TEXT NOT NULL DEFAULT '' CHECK (char_length(bio) <= 240),
  difficulty SMALLINT NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  timezone TEXT NOT NULL DEFAULT 'America/Mexico_City',
  voice TEXT,
  hue SMALLINT NOT NULL DEFAULT 160 CHECK (hue BETWEEN 0 AND 359),
  spec JSONB NOT NULL,
  spec_version INTEGER NOT NULL DEFAULT 1,
  emotion JSONB NOT NULL DEFAULT '{}',
  emotion_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_personas_user ON public.personas (user_id, last_message_at DESC NULLS LAST);

CREATE TABLE IF NOT EXISTS public.persona_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'persona', 'system')),
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text', 'voice')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  deliver_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  heard_at TIMESTAMPTZ,
  emotion JSONB,
  meta JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_persona_messages_chat ON public.persona_messages (persona_id, deliver_at);
CREATE INDEX IF NOT EXISTS idx_persona_messages_user ON public.persona_messages (user_id, created_at) WHERE role = 'user';

CREATE TABLE IF NOT EXISTS public.persona_debriefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  persona_id UUID NOT NULL REFERENCES public.personas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_at TIMESTAMPTZ,
  to_at TIMESTAMPTZ NOT NULL,
  messages_count INTEGER NOT NULL DEFAULT 0,
  report JSONB NOT NULL,
  provider TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_persona_debriefs ON public.persona_debriefs (persona_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.persona_generations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('create', 'adjust')),
  blocked_reason TEXT,
  description_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_persona_generations ON public.persona_generations (user_id, created_at DESC);

ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_debriefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "personas_select_own" ON public.personas;
CREATE POLICY "personas_select_own" ON public.personas FOR SELECT USING (auth.uid() = user_id);
-- Un mensaje programado no se lee antes de tiempo (ni por la API directa).
DROP POLICY IF EXISTS "persona_messages_select_own" ON public.persona_messages;
CREATE POLICY "persona_messages_select_own" ON public.persona_messages FOR SELECT USING (auth.uid() = user_id AND deliver_at <= NOW());
DROP POLICY IF EXISTS "persona_debriefs_select_own" ON public.persona_debriefs;
CREATE POLICY "persona_debriefs_select_own" ON public.persona_debriefs FOR SELECT USING (auth.uid() = user_id);

REVOKE ALL ON public.personas, public.persona_messages, public.persona_debriefs, public.persona_generations FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.personas, public.persona_messages, public.persona_debriefs FROM authenticated;
REVOKE ALL ON public.persona_generations FROM authenticated;
