-- Portadas automáticas de Moments (fotos CC0 / dominio público o Pexels, optimizadas a WebP ~640x360).
-- Se guardan una sola vez en moment-assets/auto/<proveedor>-<id>.webp y las comparten todos los Moments que
-- usan la misma foto (escritura solo desde el servidor). Aditiva: amplía la forma permitida de cover_path.
ALTER TABLE public.soi_blueprints DROP CONSTRAINT IF EXISTS soi_blueprints_cover_path_shape;
ALTER TABLE public.soi_blueprints ADD CONSTRAINT soi_blueprints_cover_path_shape CHECK (
  cover_path IS NULL
  OR cover_path ~ '^/(moments|demo)/[a-z0-9/_-]+\.webp$'
  OR cover_path ~ '^[0-9a-f-]{36}/cover/[0-9a-f-]{36}\.(webp|jpg|png)$'
  OR cover_path ~ '^auto/[a-z0-9_-]{3,80}\.webp$'
);
