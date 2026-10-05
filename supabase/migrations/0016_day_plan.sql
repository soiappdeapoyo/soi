-- =====================================================
-- 0016 — Aditiva. "Mi día": la secuencia de Moments que la persona quiere vivir cada día.
--  • Un plan por persona (se repite cada día); lo hecho hoy sale de moment_runs (en su zona horaria).
--  • items: [{ id, ref: "m:<uuid>" | "s:<slug>", time?: "HH:MM" }] en el orden elegido (máx. 20).
-- =====================================================
CREATE TABLE IF NOT EXISTS public.day_plans (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array' AND jsonb_array_length(items) <= 20),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.day_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dp_select_own" ON public.day_plans;
CREATE POLICY "dp_select_own" ON public.day_plans FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "dp_insert_own" ON public.day_plans;
CREATE POLICY "dp_insert_own" ON public.day_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "dp_update_own" ON public.day_plans;
CREATE POLICY "dp_update_own" ON public.day_plans FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
REVOKE INSERT, UPDATE ON public.day_plans FROM anon, authenticated;
-- El guardado es un upsert: actualiza también user_id (RLS WITH CHECK impide cambiarlo a otra persona).
GRANT INSERT (user_id, items, updated_at), UPDATE (user_id, items, updated_at) ON public.day_plans TO authenticated;
