-- =====================================================
-- 0020 — Aditiva. "Batallas": enemigos interiores (patrones, no diagnósticos).
--  • enemy_events: cada vez que SOI detecta que apareció un enemigo (en el chat o por frases típicas).
--    Lo registra el servidor; la persona puede borrar un registro que no reconozca.
--  • Las victorias no se guardan: salen de vivir después un Moment que entrena a sus aliados.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.enemy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enemy TEXT NOT NULL CHECK (enemy IN ('saboteador','critico','duda','miedo','procrastinacion','distraccion','comparacion','perfeccionista','escasez','conformista','impulsivo','victima','autosabotaje')),
  source TEXT NOT NULL DEFAULT 'chat' CHECK (source IN ('chat', 'signals', 'manual')),
  evidence TEXT CHECK (char_length(evidence) <= 300),
  goal TEXT CHECK (char_length(goal) <= 160),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_enemy_events_user ON public.enemy_events (user_id, occurred_at DESC);
ALTER TABLE public.enemy_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ee_select_own" ON public.enemy_events;
CREATE POLICY "ee_select_own" ON public.enemy_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "ee_delete_own" ON public.enemy_events;
CREATE POLICY "ee_delete_own" ON public.enemy_events FOR DELETE USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE ON public.enemy_events FROM anon, authenticated;
GRANT DELETE ON public.enemy_events TO authenticated;
