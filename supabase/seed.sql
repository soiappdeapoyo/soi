-- =====================================================
-- SEED DEMO — Comunidad SOI (solo desarrollo/staging)
-- Ejecuta automáticamente con `supabase db reset` o manualmente con `npm run db:seed`.
-- Usuarios demo: contraseña 'SoiDemo2026!'. Marcados con is_demo = TRUE.
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'valeria.demo@soi.app', crypt('SoiDemo2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"],"demo":true}', '{"full_name":"Valeria R."}', NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'camila.demo@soi.app', crypt('SoiDemo2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"],"demo":true}', '{"full_name":"Camila T."}', NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'lucia.demo@soi.app', crypt('SoiDemo2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"],"demo":true}', '{"full_name":"Lucía M."}', NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sofia.demo@soi.app', crypt('SoiDemo2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"],"demo":true}', '{"full_name":"Sofía G."}', NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'daniela.demo@soi.app', crypt('SoiDemo2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"],"demo":true}', '{"full_name":"Daniela P."}', NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'andres.demo@soi.app', crypt('SoiDemo2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"],"demo":true}', '{"full_name":"Andrés L."}', NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'mariana.demo@soi.app', crypt('SoiDemo2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"],"demo":true}', '{"full_name":"Mariana V."}', NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;
INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000000', 'a1000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'renata.demo@soi.app', crypt('SoiDemo2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"],"demo":true}', '{"full_name":"Renata C."}', NOW() - INTERVAL '30 days', NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE public.user_profiles SET plan = 'soi_plus', onboarding_completed = TRUE, streak_current = 7 + (random()*30)::INT, country = v.c
FROM (VALUES ('a1000000-0000-4000-8000-000000000001'::uuid,'MX'), ('a1000000-0000-4000-8000-000000000002'::uuid,'CO'), ('a1000000-0000-4000-8000-000000000003'::uuid,'ES'), ('a1000000-0000-4000-8000-000000000004'::uuid,'AR'), ('a1000000-0000-4000-8000-000000000005'::uuid,'US'), ('a1000000-0000-4000-8000-000000000006'::uuid,'CL'), ('a1000000-0000-4000-8000-000000000007'::uuid,'PE'), ('a1000000-0000-4000-8000-000000000008'::uuid,'MX')) AS v(u, c) WHERE user_id = v.u;

INSERT INTO public.community_posts (user_id, type, content, is_anonymous, is_public, moderated, is_demo, author_name, reactions, created_at) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'evidencia', 'Llevo 21 días con el ritual de 5 minutos de Brian Tracy. Hoy me di cuenta de que ya no despierto pensando en lo que me falta, sino en lo que voy a crear.', FALSE, TRUE, TRUE, TRUE, 'Valeria R.', '{"amen":20,"fuerza":9,"gracias":25,"corazon":3}', NOW() - INTERVAL '12 hours'),
  ('a1000000-0000-4000-8000-000000000002', 'testimonio', 'Practiqué SATS tres noches seguidas visualizando la llamada de confirmación del nuevo trabajo. No sé qué pase, pero me siento en paz y eso ya es un cambio enorme.', FALSE, TRUE, TRUE, TRUE, 'Camila T.', '{"amen":4,"fuerza":34,"gracias":6,"corazon":23}', NOW() - INTERVAL '1 day'),
  ('a1000000-0000-4000-8000-000000000003', 'peticion', 'Pido fuerza para mañana: tengo una conversación difícil con mi familia y quiero llegar desde la calma, no desde el miedo.', TRUE, TRUE, TRUE, TRUE, NULL, '{"amen":37,"fuerza":3,"gracias":32,"corazon":13}', NOW() - INTERVAL '1 day 3 hours'),
  ('a1000000-0000-4000-8000-000000000004', 'pregunta', '¿Alguien hace el Miracle Morning en versión corta? Con dos peques no me alcanzan 36 minutos. ¿Cómo lo adaptan?', FALSE, TRUE, TRUE, TRUE, 'Sofía G.', '{"amen":2,"fuerza":5,"gracias":27,"corazon":26}', NOW() - INTERVAL '1 day 8 hours'),
  ('a1000000-0000-4000-8000-000000000005', 'evidencia', 'Escribí mis 10 metas en presente durante un mes. Tres ya se cumplieron, incluida la de terminar mi certificación. ¡Gracias, comunidad!', FALSE, TRUE, TRUE, TRUE, 'Daniela P.', '{"amen":4,"fuerza":15,"gracias":5,"corazon":35}', NOW() - INTERVAL '2 days'),
  ('a1000000-0000-4000-8000-000000000006', 'testimonio', 'El bloque de 20 minutos de movimiento del Club de las 5 AM me cambió el humor del día. Antes era café y celular; ahora es caminar y respirar.', FALSE, TRUE, TRUE, TRUE, 'Andrés L.', '{"amen":27,"fuerza":3,"gracias":36,"corazon":7}', NOW() - INTERVAL '2 days 6 hours'),
  ('a1000000-0000-4000-8000-000000000007', 'evidencia', 'Hice la Revisión de Neville con una discusión de la semana pasada. Hoy esa persona me escribió para disculparse. Lo anoto en mi muro.', TRUE, TRUE, TRUE, TRUE, NULL, '{"amen":14,"fuerza":40,"gracias":40,"corazon":37}', NOW() - INTERVAL '3 days'),
  ('a1000000-0000-4000-8000-000000000008', 'peticion', 'Les pido una oración o buena vibra: mi mamá empieza un tratamiento esta semana.', FALSE, TRUE, TRUE, TRUE, 'Renata C.', '{"amen":3,"fuerza":36,"gracias":37,"corazon":25}', NOW() - INTERVAL '3 days 4 hours'),
  ('a1000000-0000-4000-8000-000000000001', 'pregunta', 'Para quienes usan el protocolo de Joe Dispenza: ¿la pausa de la tarde la hacen en la oficina? Busco ideas discretas.', FALSE, TRUE, TRUE, TRUE, 'Valeria R.', '{"amen":3,"fuerza":14,"gracias":2,"corazon":35}', NOW() - INTERVAL '4 days'),
  ('a1000000-0000-4000-8000-000000000002', 'evidencia', 'Primer mes completo sin romper la racha. El escudo me salvó una vez y no me sentí culpable. Eso es nuevo para mí.', FALSE, TRUE, TRUE, TRUE, 'Camila T.', '{"amen":8,"fuerza":18,"gracias":26,"corazon":9}', NOW() - INTERVAL '4 days 9 hours'),
  ('a1000000-0000-4000-8000-000000000003', 'testimonio', 'Mi afirmación de esta semana: «Soy una persona que termina lo que empieza». La repito en voz alta y la escribo en una tarjeta.', FALSE, TRUE, TRUE, TRUE, 'Lucía M.', '{"amen":34,"fuerza":7,"gracias":36,"corazon":19}', NOW() - INTERVAL '5 days'),
  ('a1000000-0000-4000-8000-000000000004', 'evidencia', 'Hoy dije que no a algo que no quería hacer, sin dar explicaciones. Pequeño, pero para mí es enorme.', TRUE, TRUE, TRUE, TRUE, NULL, '{"amen":35,"fuerza":11,"gracias":6,"corazon":37}', NOW() - INTERVAL '5 days 5 hours'),
  ('a1000000-0000-4000-8000-000000000005', 'peticion', 'Busco compañía para el reto de 21 días de afirmaciones. ¿Quién se une?', FALSE, TRUE, TRUE, TRUE, 'Daniela P.', '{"amen":36,"fuerza":40,"gracias":12,"corazon":23}', NOW() - INTERVAL '6 days'),
  ('a1000000-0000-4000-8000-000000000006', 'pregunta', '¿Qué libro recomiendan para empezar con Napoleon Hill? Escuché que Piense y hágase rico es denso.', FALSE, TRUE, TRUE, TRUE, 'Andrés L.', '{"amen":6,"fuerza":35,"gracias":4,"corazon":36}', NOW() - INTERVAL '6 days 7 hours'),
  ('a1000000-0000-4000-8000-000000000007', 'evidencia', 'Ahorré por primera vez el 10% de mi ingreso tres meses seguidos. El agente de Riqueza me ayudó a ver qué creencia me frenaba.', FALSE, TRUE, TRUE, TRUE, 'Mariana V.', '{"amen":3,"fuerza":39,"gracias":13,"corazon":31}', NOW() - INTERVAL '7 days'),
  ('a1000000-0000-4000-8000-000000000008', 'testimonio', 'Gracias a quien compartió lo de la gratitud nocturna. Duermo mejor desde que cierro el día con tres cosas buenas.', FALSE, TRUE, TRUE, TRUE, 'Renata C.', '{"amen":34,"fuerza":27,"gracias":20,"corazon":29}', NOW() - INTERVAL '7 days 6 hours'),
  ('a1000000-0000-4000-8000-000000000001', 'peticion', 'Mañana presento mi proyecto. Pido que me manden fuerza 💪', FALSE, TRUE, TRUE, TRUE, 'Valeria R.', '{"amen":37,"fuerza":29,"gracias":23,"corazon":19}', NOW() - INTERVAL '8 days'),
  ('a1000000-0000-4000-8000-000000000002', 'pregunta', '¿Cómo saben si una visualización «funcionó»? A veces me siento bien y otras no siento nada.', FALSE, TRUE, TRUE, TRUE, 'Camila T.', '{"amen":15,"fuerza":11,"gracias":15,"corazon":5}', NOW() - INTERVAL '9 days'),
  ('a1000000-0000-4000-8000-000000000003', 'evidencia', 'Leí 10 páginas diarias durante 40 días. Terminé cuatro libros. Nunca había leído tanto.', FALSE, TRUE, TRUE, TRUE, 'Lucía M.', '{"amen":36,"fuerza":19,"gracias":33,"corazon":31}', NOW() - INTERVAL '10 days'),
  ('a1000000-0000-4000-8000-000000000004', 'testimonio', 'Lo que más me ayuda de SOI es que no me juzga cuando fallo un día. Retomo y ya.', FALSE, TRUE, TRUE, TRUE, 'Sofía G.', '{"amen":21,"fuerza":28,"gracias":18,"corazon":38}', NOW() - INTERVAL '11 days');
