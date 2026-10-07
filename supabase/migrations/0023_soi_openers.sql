-- Saludo del chat preparado de antemano (escrito por la IA a partir de un "gancho": lo que SOI sabe y vale la pena
-- recordar hoy). Uno por persona: el próximo saludo y los últimos ganchos/textos usados para no repetirse.
-- Aditiva. Lo escribe solo el servidor (service role); la persona solo lee el suyo.
CREATE TABLE IF NOT EXISTS public.soi_openers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL CHECK (char_length(text) BETWEEN 1 AND 600),
  replies JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(replies) = 'array'),
  hook TEXT NOT NULL CHECK (char_length(hook) <= 120),
  time_bound BOOLEAN NOT NULL DEFAULT FALSE,
  part TEXT NOT NULL CHECK (part IN ('manana', 'tarde', 'noche')),
  for_date DATE NOT NULL,
  source_at TIMESTAMPTZ,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ,
  recent_hooks TEXT[] NOT NULL DEFAULT '{}',
  recent_texts TEXT[] NOT NULL DEFAULT '{}'
);

ALTER TABLE public.soi_openers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "op_select_own" ON public.soi_openers;
CREATE POLICY "op_select_own" ON public.soi_openers FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.soi_openers FROM anon, authenticated;
GRANT SELECT ON public.soi_openers TO authenticated;
