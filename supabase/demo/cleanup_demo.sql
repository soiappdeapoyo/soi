-- =====================================================
-- LIMPIEZA DEL DEMO — elimina los 8 usuarios demo y todo su contenido.
-- Uso: supabase db query --linked -f supabase/demo/cleanup_demo.sql
--
-- Borrar los usuarios elimina en cascada: perfiles, posts y reacciones de la comunidad, perfiles de creador,
-- Moments, Blueprints (y las implementaciones o guardados que usuarios reales hicieran de ellos), memoria y momentum.
-- Los Moments reales que apuntaban a un Blueprint demo conservan su contenido (blueprint_id pasa a NULL).
--
-- Seguridad: si existe alguna COMPRA de un Blueprint demo, el script se detiene sin borrar nada
-- (las compras son dinero real y requieren revisión manual).
-- =====================================================
BEGIN;

DO $$
DECLARE v_purchases INT;
BEGIN
  SELECT COUNT(*) INTO v_purchases
  FROM public.blueprint_purchases p
  JOIN auth.users u ON u.id = p.creator_id
  WHERE u.email LIKE '%.demo@soi.app';
  IF v_purchases > 0 THEN
    RAISE EXCEPTION 'Hay % compra(s) de Blueprints demo. Revísalas antes de limpiar.', v_purchases;
  END IF;
END $$;

-- Posts demo por si alguno quedó sin usuario asociado
DELETE FROM public.community_posts WHERE is_demo = TRUE;

DELETE FROM auth.users WHERE email LIKE '%.demo@soi.app';

-- Comprobación: debe devolver ceros
SELECT
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '%.demo@soi.app') AS demo_users,
  (SELECT COUNT(*) FROM public.creator_profiles WHERE is_demo) AS demo_creators,
  (SELECT COUNT(*) FROM public.soi_blueprints WHERE is_demo) AS demo_blueprints,
  (SELECT COUNT(*) FROM public.soi_moments WHERE is_demo) AS demo_moments,
  (SELECT COUNT(*) FROM public.community_posts WHERE is_demo) AS demo_posts;

COMMIT;
