-- SOI por puertas: la persona entra por un dolor (amor, ansiedad, dinero, constancia) y ve una app enfocada.
-- Las cuentas que ya existían siguen en SOI Full (ui_mode = 'full'). Solo escribe el servidor (/auth/callback, /api/door).

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS door TEXT;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS extra_doors TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS ui_mode TEXT NOT NULL DEFAULT 'full';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_door_check') THEN
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_door_check
      CHECK (door IS NULL OR door IN ('amor', 'ansiedad', 'dinero', 'constancia'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_extra_doors_check') THEN
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_extra_doors_check
      CHECK (extra_doors <@ ARRAY['amor', 'ansiedad', 'dinero', 'constancia']::TEXT[]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_ui_mode_check') THEN
    ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_ui_mode_check
      CHECK (ui_mode IN ('full', 'door'));
  END IF;
END $$;

-- Para medir por puerta en el panel.
CREATE INDEX IF NOT EXISTS user_profiles_door_idx ON public.user_profiles (door) WHERE door IS NOT NULL;
