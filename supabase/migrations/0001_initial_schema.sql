CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- TABLA MAESTRA — transversal para toda la IA (estilo Notion/Monday)
-- =====================================================
CREATE TABLE public.agent_knowledge (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Equivalente a "base" en Notion / "board" en Monday
  category TEXT NOT NULL CHECK (category IN (
    'manifestacion', 'afirmacion', 'meditacion', 'sueno',
    'riqueza', 'rutina', 'brian_tracy_journal',
    'perfil_usuario', 'conversacion', 'evidencia', 'ritual_diario',
    'aprendizaje_web', 'video_cache', 'crisis_log',
    'comunidad_post', 'comunidad_peticion',
    'pensamiento', 'emocion', 'accion', 'resultado'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  -- Propiedades flexibles. Ej: { "eslabon_soi": "pensamiento", "autor": "Neville Goddard", "tecnica": "SATS" }
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'activo' CHECK (status IN (
    'activo', 'archivado', 'completado', 'pausado', 'en_progreso'
  )),
  priority INTEGER NOT NULL DEFAULT 0,
  embedding VECTOR(768),
  parent_id UUID REFERENCES public.agent_knowledge(id) ON DELETE SET NULL,
  related_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ak_user_category ON public.agent_knowledge (user_id, category);
CREATE INDEX idx_ak_created ON public.agent_knowledge (user_id, created_at DESC);
CREATE INDEX idx_ak_tags ON public.agent_knowledge USING GIN (tags);
CREATE INDEX idx_ak_metadata ON public.agent_knowledge USING GIN (metadata);
CREATE INDEX idx_ak_embedding ON public.agent_knowledge
  USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ak_updated_at
BEFORE UPDATE ON public.agent_knowledge
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- CONVERSACIONES Y MENSAJES
-- =====================================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Nueva conversación',
  agent_category TEXT NOT NULL DEFAULT 'general',
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_count INTEGER NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_conv_user ON public.conversations (user_id, last_message_at DESC);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
  content TEXT NOT NULL,
  agent_category TEXT,
  tool_calls JSONB,
  tool_results JSONB,
  tokens_used INTEGER,
  provider TEXT, -- 'gemini' | 'groq' | 'deepseek'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_msg_conv ON public.messages (conversation_id, created_at ASC);

-- =====================================================
-- PERFIL DEL USUARIO
-- =====================================================
CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  archetype TEXT,
  dominant_emotion TEXT,
  recurring_themes TEXT[] DEFAULT '{}',
  spiritual_framework TEXT,
  goals TEXT[] DEFAULT '{}',
  blockers TEXT[] DEFAULT '{}',
  streak_current INTEGER NOT NULL DEFAULT 0,
  streak_longest INTEGER NOT NULL DEFAULT 0,
  ritual_phase TEXT DEFAULT 'chispa',
  preferred_routine TEXT DEFAULT 'brian_tracy_5min',
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  voice_preference TEXT,
  tts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  morning_time TIME DEFAULT '07:00',
  evening_time TIME DEFAULT '21:00',
  timezone TEXT DEFAULT 'America/Mexico_City',
  weakest_link TEXT CHECK (weakest_link IN ('pensamiento', 'emocion', 'accion', 'resultado')),
  plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'free', 'soi_plus')),
  trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  free_queries_remaining INTEGER NOT NULL DEFAULT 20,
  free_queries_reset_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT,
  subscription_ends_at TIMESTAMPTZ,
  is_paywalled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_up_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Amigo'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- RUTINAS DIARIAS
-- =====================================================
CREATE TABLE public.daily_routines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  routine_type TEXT NOT NULL CHECK (routine_type IN (
    'brian_tracy_5min', 'miracle_morning', 'five_am_club',
    'dispenza_protocol', 'neville_sats', 'custom'
  )),
  routine_date DATE NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_duration_seconds INTEGER,
  steps_completed JSONB NOT NULL DEFAULT '[]'::jsonb,
  mood_before INTEGER CHECK (mood_before BETWEEN 1 AND 5),
  mood_after INTEGER CHECK (mood_after BETWEEN 1 AND 5),
  journal_entry TEXT,
  gratitude TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, routine_date, routine_type)
);
CREATE INDEX idx_dr_user_date ON public.daily_routines (user_id, routine_date DESC);

-- =====================================================
-- RACHAS / RITUAL DIARIO
-- =====================================================
CREATE TABLE public.ritual_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ritual_date DATE NOT NULL,
  phase TEXT NOT NULL,
  completed_steps TEXT[] DEFAULT '{}',
  mood_before INTEGER CHECK (mood_before BETWEEN 1 AND 5),
  mood_after INTEGER CHECK (mood_after BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ritual_date)
);

-- =====================================================
-- COMUNIDAD
-- =====================================================
CREATE TABLE public.community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('evidencia', 'peticion', 'testimonio', 'pregunta')),
  content TEXT NOT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  reactions JSONB NOT NULL DEFAULT '{"amen":0,"fuerza":0,"gracias":0,"corazon":0}'::jsonb,
  moderated BOOLEAN NOT NULL DEFAULT FALSE,
  flagged BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_cp_created ON public.community_posts (is_public, created_at DESC);

CREATE TABLE public.community_reactions (
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id, reaction)
);
