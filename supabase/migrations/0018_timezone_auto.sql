-- =====================================================
-- 0018 — Aditiva. Zona horaria automática (del dispositivo) o elegida por la persona.
--  • timezone_auto = TRUE: la app sincroniza user_profiles.timezone con la del dispositivo al abrirse.
--  • FALSE: la persona eligió una zona en Ajustes (entre las de su país) y no se toca.
-- =====================================================
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS timezone_auto BOOLEAN NOT NULL DEFAULT TRUE;
GRANT UPDATE (timezone_auto) ON public.user_profiles TO authenticated;
