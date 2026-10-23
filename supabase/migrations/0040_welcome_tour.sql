-- Introducción de bienvenida (WelcomeTour): cuándo la vio o la saltó por última vez. Null = se muestra al entrar.
-- Se escribe solo desde el servidor (/api/tour); por eso no se concede UPDATE de la columna a los clientes.
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS tour_seen_at TIMESTAMPTZ;
