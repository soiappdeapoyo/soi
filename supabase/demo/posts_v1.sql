-- =====================================================
-- Demo: publicaciones de Impulso (requiere 0010). Idempotente (ids fijos).
-- Se borran solas al eliminar a los usuarios demo (cleanup_demo.sql).
-- =====================================================
INSERT INTO public.soi_posts (id, author_id, body, moment_id, moment_slug, like_count, is_demo, created_at) VALUES
  ('f1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001',
   'Tres semanas haciendo el ritual de 5 minutos antes de abrir el teléfono. Lo que más cambió no fue mi productividad: fue cómo me hablo por la mañana.',
   NULL, 'brian_tracy_5min', 24, TRUE, NOW() - INTERVAL '3 hours'),
  ('f1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000007',
   'Diseñé este Moment para revisar mis finanzas sin culpa. 10 minutos los domingos. Si lo pruebas, cuéntame qué creencia te apareció.',
   'b1000000-0000-4000-8000-000000000003', NULL, 41, TRUE, NOW() - INTERVAL '9 hours'),
  ('f1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003',
   'Hoy no tenía ganas de nada. Hice el Moment de 5 minutos para recuperar momentum y terminé ordenando el escritorio. A veces basta con empezar.',
   'b1000000-0000-4000-8000-000000000001', NULL, 17, TRUE, NOW() - INTERVAL '1 day'),
  ('f1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000006',
   'Pregunta honesta para quienes hacen el Club de las 5 AM: ¿cómo manejan las noches en que se duermen tarde? Yo estoy probando la versión de 20 minutos.',
   NULL, 'five_am_club', 9, TRUE, NOW() - INTERVAL '1 day 5 hours'),
  ('f1000000-0000-4000-8000-000000000005', 'a1000000-0000-4000-8000-000000000002',
   'Anoche hice SATS por primera vez. No pasó nada mágico, pero me dormí tranquila, sin repasar la lista de pendientes. Eso ya es mucho.',
   NULL, 'neville_sats', 33, TRUE, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.soi_posts (id, author_id, body, parent_id, root_id, is_demo, created_at) VALUES
  ('f1000000-0000-4000-8000-000000000011', 'a1000000-0000-4000-8000-000000000004', 'Me pasa igual. La parte de escribir la frase arriba de la hoja me cambia el tono del día.',
   'f1000000-0000-4000-8000-000000000001', 'f1000000-0000-4000-8000-000000000001', TRUE, NOW() - INTERVAL '2 hours'),
  ('f1000000-0000-4000-8000-000000000012', 'a1000000-0000-4000-8000-000000000005', 'Lo probé hoy. Me apareció «nunca alcanza». Ya la anoté para trabajarla.',
   'f1000000-0000-4000-8000-000000000002', 'f1000000-0000-4000-8000-000000000002', TRUE, NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.follows (follower_id, followee_id) VALUES
  ('a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000007'),
  ('a1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000001')
ON CONFLICT DO NOTHING;
