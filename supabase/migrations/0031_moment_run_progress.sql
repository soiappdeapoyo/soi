-- =====================================================
-- 0031 — Aditiva. Retomar un Moment donde se dejó (interrupciones externas: una llamada, cerrar la app).
--  • moment_runs guarda el paso actual (índice e id del bloque), los segundos que le quedaban, el % de avance
--    (por tiempo, 0–99 hasta terminar) y la última actividad.
--  • La persona solo los actualiza en sus ejecuciones sin terminar (la política mr_update_own ya lo exige).
--  • Nada se borra: una ejecución sin terminar queda como historial si se empieza de nuevo.
-- =====================================================

ALTER TABLE public.moment_runs ADD COLUMN IF NOT EXISTS step_index SMALLINT CHECK (step_index BETWEEN 0 AND 200);
ALTER TABLE public.moment_runs ADD COLUMN IF NOT EXISTS step_block_id TEXT CHECK (char_length(step_block_id) <= 64);
ALTER TABLE public.moment_runs ADD COLUMN IF NOT EXISTS step_remaining INTEGER CHECK (step_remaining BETWEEN 0 AND 36000);
ALTER TABLE public.moment_runs ADD COLUMN IF NOT EXISTS progress SMALLINT NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100);
ALTER TABLE public.moment_runs ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

GRANT UPDATE (step_index, step_block_id, step_remaining, progress, last_active_at) ON public.moment_runs TO authenticated;

-- Lo sin terminar de cada persona (para "Retomar" en el reproductor, Hoy y Mi Vida).
CREATE INDEX IF NOT EXISTS idx_runs_unfinished ON public.moment_runs (user_id, last_active_at DESC) WHERE completed_at IS NULL;
