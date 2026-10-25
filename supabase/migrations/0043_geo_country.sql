-- País de origen detectado por la IP (encabezado de Vercel; la IP no se guarda) la primera vez que la persona entra.
-- /persons lo usa para los regionalismos de los personajes y del coach. Solo lo escribe el servidor (no está en el
-- GRANT UPDATE de columnas de 0005). `country` sigue siendo el país elegido (líneas de ayuda, zonas horarias).
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS geo_country TEXT;
DO $$ BEGIN
  ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_geo_country_check CHECK (geo_country IS NULL OR geo_country ~ '^[A-Z]{2}$');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
