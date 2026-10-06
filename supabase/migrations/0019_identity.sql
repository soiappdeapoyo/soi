-- =====================================================
-- 0019 — Aditiva. "Mi Nuevo Yo": identidad construida con evidencia.
--  • identities: identidades que la persona está construyendo (SOI propone, la persona confirma).
--  • identity_links: a qué identidades y capacidades contribuye cada Moment (m:/s:) o evidencia del Muro (e:).
--    Lo clasifica el servidor (IA o reglas) una vez; si cambian las identidades, se reclasifica.
--  • identity_stories: relato semanal de su historia (lo escribe la IA, una vez por semana).
--  La evidencia en sí no se duplica: sale de moment_runs y agent_knowledge (evidencia).
-- =====================================================
CREATE TABLE IF NOT EXISTS public.identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 60),
  description TEXT CHECK (char_length(description) <= 240),
  capacities TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(capacities) <= 6),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('proposed', 'active', 'archived')),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_identities_user ON public.identities (user_id, status, position);
ALTER TABLE public.identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "id_select_own" ON public.identities;
CREATE POLICY "id_select_own" ON public.identities FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "id_insert_own" ON public.identities;
CREATE POLICY "id_insert_own" ON public.identities FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "id_update_own" ON public.identities;
CREATE POLICY "id_update_own" ON public.identities FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "id_delete_own" ON public.identities;
CREATE POLICY "id_delete_own" ON public.identities FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.identity_links (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ref TEXT NOT NULL CHECK (ref ~ '^(m:[0-9a-f-]{36}|s:[a-z0-9_]{2,60}|e:[0-9a-f-]{36})$'),
  identity_ids UUID[] NOT NULL DEFAULT '{}',
  capacities TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'rules' CHECK (source IN ('ai', 'rules', 'user')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, ref)
);
ALTER TABLE public.identity_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "il_select_own" ON public.identity_links;
CREATE POLICY "il_select_own" ON public.identity_links FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.identity_links FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.identity_stories (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  story TEXT NOT NULL CHECK (char_length(story) <= 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, week_start)
);
ALTER TABLE public.identity_stories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "is_select_own" ON public.identity_stories;
CREATE POLICY "is_select_own" ON public.identity_stories FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.identity_stories FROM anon, authenticated;
