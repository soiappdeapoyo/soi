-- =====================================================
-- Demo: portadas de los Moments demo (requiere 0013). Imágenes en public/demo/moments (licencia Unsplash). Idempotente.
-- =====================================================
UPDATE public.soi_blueprints SET cover_path = '/demo/moments/recuperar-momentum.webp' WHERE id = 'b1000000-0000-4000-8000-000000000001';
UPDATE public.soi_blueprints SET cover_path = '/demo/moments/morning-success.webp' WHERE id = 'b1000000-0000-4000-8000-000000000002';
UPDATE public.soi_blueprints SET cover_path = '/demo/moments/revision-financiera.webp' WHERE id = 'b1000000-0000-4000-8000-000000000003';
