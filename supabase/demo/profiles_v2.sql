-- =====================================================
-- Demo: fotos de perfil reales, biografías, enlaces de creador y fotos en publicaciones (requiere 0012).
-- Las imágenes viven en la app (public/demo, licencia Unsplash; créditos en public/demo/CREDITS.md),
-- así funcionan igual en local y en producción. Idempotente.
-- =====================================================
WITH d(id, slug, bio) AS (VALUES
  ('a1000000-0000-4000-8000-000000000001'::uuid, 'valeria', 'Mamá de dos. 21 días seguidos con el ritual de 5 minutos. Escribo lo que me funciona.'),
  ('a1000000-0000-4000-8000-000000000002'::uuid, 'camila', 'Aprendiendo a dormir sin repasar pendientes. SATS y diario de gratitud.'),
  ('a1000000-0000-4000-8000-000000000003'::uuid, 'lucia', 'Diseñadora. Empiezo pequeño: 5 minutos y ver qué pasa.'),
  ('a1000000-0000-4000-8000-000000000004'::uuid, 'sofia', 'Gratitud todas las noches. Coleccionando evidencias de que sí puedo.'),
  ('a1000000-0000-4000-8000-000000000005'::uuid, 'daniela', 'Leo 10 páginas al día (casi siempre). Miracle Morning versión corta.'),
  ('a1000000-0000-4000-8000-000000000006'::uuid, 'andres', 'Probando el Club de las 5 AM sin morir en el intento.'),
  ('a1000000-0000-4000-8000-000000000007'::uuid, 'mariana', 'Finanzas sin culpa. Creo Moments para ordenar tu dinero y tus creencias.'),
  ('a1000000-0000-4000-8000-000000000008'::uuid, 'renata', 'Caminatas largas y meditación. Volviendo a mí, un día a la vez.')
)
UPDATE public.user_profiles p SET avatar_url = '/demo/avatars/' || d.slug || '.webp', bio = d.bio
FROM d WHERE p.user_id = d.id;

UPDATE public.creator_profiles c SET avatar_url = p.avatar_url
FROM public.user_profiles p WHERE c.user_id = p.user_id AND c.is_demo;

UPDATE public.creator_profiles SET links = '[
  {"label":"Brian Tracy, el autor del ritual","url":"https://es.wikipedia.org/wiki/Brian_Tracy"},
  {"label":"The Miracle Morning","url":"https://miraclemorning.com/"}
]'::jsonb WHERE user_id = 'a1000000-0000-4000-8000-000000000001';
UPDATE public.creator_profiles SET links = '[
  {"label":"Piense y hágase rico (Napoleon Hill)","url":"https://es.wikipedia.org/wiki/Piense_y_h%C3%A1gase_rico"}
]'::jsonb WHERE user_id = 'a1000000-0000-4000-8000-000000000007';

-- Fotos en publicaciones existentes
UPDATE public.soi_posts SET images = '{/demo/posts/ritual-cuaderno.webp}' WHERE id = 'f1000000-0000-4000-8000-000000000001';
UPDATE public.soi_posts SET images = '{/demo/posts/escritorio.webp}' WHERE id = 'f1000000-0000-4000-8000-000000000003';
UPDATE public.soi_posts SET images = '{/demo/posts/amanecer-correr.webp}' WHERE id = 'f1000000-0000-4000-8000-000000000004';
UPDATE public.soi_posts SET images = '{/demo/posts/noche-lampara.webp}' WHERE id = 'f1000000-0000-4000-8000-000000000005';

-- Publicaciones nuevas con fotos
INSERT INTO public.soi_posts (id, author_id, body, images, moment_slug, like_count, is_demo, created_at) VALUES
  ('f1000000-0000-4000-8000-000000000006', 'a1000000-0000-4000-8000-000000000008',
   'Caminata de 40 minutos sin audífonos. Al principio la mente no se callaba; al final solo escuchaba mis pasos. Hoy esa fue mi meditación.',
   '{/demo/posts/sendero-1.webp,/demo/posts/sendero-2.webp}', NULL, 28, TRUE, NOW() - INTERVAL '5 hours'),
  ('f1000000-0000-4000-8000-000000000007', 'a1000000-0000-4000-8000-000000000004',
   'Día 12 escribiendo tres cosas por las que agradezco antes de dormir. Hoy la primera fue: «me pedí ayuda a tiempo».',
   '{/demo/posts/gratitud.webp}', NULL, 36, TRUE, NOW() - INTERVAL '14 hours'),
  ('f1000000-0000-4000-8000-000000000008', 'a1000000-0000-4000-8000-000000000005',
   'La R de S.A.V.E.R.S. es mi favorita. 10 páginas con el café, junto a la ventana, antes de que la casa despierte.',
   '{/demo/posts/lectura-ventana.webp}', 'miracle_morning', 19, TRUE, NOW() - INTERVAL '1 day 8 hours')
ON CONFLICT (id) DO UPDATE SET images = EXCLUDED.images;
