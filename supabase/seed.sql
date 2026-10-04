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

-- GoTrue no acepta NULL en las columnas de tokens: sin esto, los usuarios demo no pueden iniciar sesión
-- ("Database error querying schema").
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''), recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''), email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''), phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''), reauthentication_token = COALESCE(reauthentication_token, '')
WHERE email LIKE '%.demo@soi.app';

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

-- =====================================================
-- SEED DEMO — SOI Moments, Blueprints y creadores (requiere 0007)
-- =====================================================
INSERT INTO public.creator_profiles (user_id, handle, display_name, bio, methodology, principles, boundaries, is_verified, is_demo) VALUES
  ('a1000000-0000-4000-8000-000000000001', 'valeria_r', 'Valeria R.', 'Ayudo a personas con poco tiempo a empezar el día con intención.',
   'Mañanas cortas y escritas. Primero claridad en papel, después acción. Inspirado en Brian Tracy y Hal Elrod.',
   ARRAY['Escribir antes de reaccionar', 'Pequeño y diario vence a grande y ocasional', 'Sin culpa cuando fallas un día'],
   ARRAY['No dar consejos médicos', 'No prometer resultados garantizados'], TRUE, TRUE),
  ('a1000000-0000-4000-8000-000000000007', 'mariana_finanzas', 'Mariana V.', 'Finanzas personales desde las creencias hasta el hábito.',
   'Primero detectar la creencia de escasez, luego un sistema semanal simple de revisión de gastos y ahorro automático. Basado en Napoleon Hill y Brian Tracy.',
   ARRAY['El dinero sigue a la claridad', 'Revisión semanal, no culpa diaria', 'Ahorro primero, gasto después'],
   ARRAY['No recomendar inversiones ni productos financieros específicos', 'No pedir datos bancarios'], TRUE, TRUE)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.soi_blueprints (id, creator_id, title, objective, required_minutes, duration_days, difficulty, eslabon, target_states, steps, source, tier, price_cents, status, implementations_count, completions_count, steps_completed_count, is_demo, created_at) VALUES
  ('b1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', '5 minutos para recuperar momentum',
   'Volver a moverte después de días sin motivación, sin exigirte de más.', 5, 7, 'suave', 'accion', ARRAY['motivation', 'discipline'],
   '[{"title":"Escribe: Hoy va a ser un buen día","minutes":1},{"title":"Anota la única tarea que haría el día mejor","minutes":2},{"title":"Hazla durante 2 minutos, aunque no la termines","minutes":2}]',
   'Brian Tracy — Eat That Frog! (adaptado por Valeria R.)', 'free', 0, 'published', 1240, 610, 4100, TRUE, NOW() - INTERVAL '20 days'),
  ('b1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000001', 'Morning Success System · 30 días',
   'Construir una mañana que te dé claridad y disciplina, adaptada a tu tiempo real.', 20, 30, 'media', 'accion', ARRAY['discipline', 'career'],
   '[{"title":"Silencio y respiración","minutes":3},{"title":"Afirmaciones en presente","minutes":3},{"title":"Visualiza tu día ideal","minutes":4},{"title":"Lee 5 páginas","minutes":5},{"title":"Escribe 3 metas y la acción de hoy","minutes":5}]',
   'Hal Elrod — The Miracle Morning (adaptado por Valeria R.)', 'premium', 1900, 'published', 380, 140, 2600, TRUE, NOW() - INTERVAL '12 days'),
  ('b1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000007', 'Revisión financiera de 10 minutos',
   'Pasar de la ansiedad por el dinero a un sistema semanal claro.', 10, 28, 'suave', 'accion', ARRAY['finance', 'anxiety'],
   '[{"title":"Revisa los gastos de la semana sin juzgarte","minutes":4},{"title":"Nombra la creencia que apareció","minutes":2},{"title":"Define el ahorro de la próxima semana","minutes":2},{"title":"Escribe una evidencia de avance","minutes":2}]',
   'Napoleon Hill — Think and Grow Rich (adaptado por Mariana V.)', 'free', 0, 'published', 860, 300, 2900, TRUE, NOW() - INTERVAL '9 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.soi_moments (id, creator_id, author_name, title, category, trigger_state, source_type, source_reference, insight, reflection_question, user_reflection, actions, visibility, blueprint_id, resonance_count, save_count, is_demo, created_at) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'a1000000-0000-4000-8000-000000000001', 'Valeria R.', 'Recuperé el enfoque con 5 minutos al día', 'accion', ARRAY['motivation'], 'book', 'Brian Tracy — Eat That Frog!',
   'No necesitaba más motivación; necesitaba una sola tarea clara antes de abrir el teléfono.', '¿Qué idea quieres convertir en parte de tu vida?',
   'Elegir la tarea la noche anterior y empezarla 2 minutos al despertar.', '[{"title":"Elegir la tarea de mañana antes de dormir","minutes":2}]',
   'community', 'b1000000-0000-4000-8000-000000000001', 48, 31, TRUE, NOW() - INTERVAL '21 days'),
  ('c1000000-0000-4000-8000-000000000002', 'a1000000-0000-4000-8000-000000000007', 'Mariana V.', 'Convertí una idea de Napoleon Hill en mi sistema financiero', 'pensamiento', ARRAY['finance'], 'book', 'Napoleon Hill — Think and Grow Rich',
   'El deseo definido cambia cuando lo escribes con una cifra y una fecha. El mío dejó de ser "ahorrar más".', '¿Qué fue lo que más resonó contigo?',
   'Escribí mi meta de ahorro con cifra y fecha y la leo cada domingo.', '[{"title":"Escribir la meta con cifra y fecha","minutes":5},{"title":"Revisión de gastos los domingos","minutes":10}]',
   'community', 'b1000000-0000-4000-8000-000000000003', 62, 44, TRUE, NOW() - INTERVAL '10 days'),
  ('c1000000-0000-4000-8000-000000000003', 'a1000000-0000-4000-8000-000000000003', 'Lucía M.', 'Dejé de esperar a sentirme lista', 'emocion', ARRAY['anxiety', 'career'], 'personal_experience', NULL,
   'La calma no llegó antes de actuar; llegó después de la primera acción pequeña.', '¿Qué idea quieres convertir en parte de tu vida?',
   'Cuando aparezca el miedo, respiro un minuto y hago la versión más pequeña de la tarea.', '[{"title":"1 minuto de respiración antes de empezar","minutes":1},{"title":"Hacer la versión de 5 minutos","minutes":5}]',
   'community', NULL, 27, 12, TRUE, NOW() - INTERVAL '4 days'),
  ('c1000000-0000-4000-8000-000000000004', 'a1000000-0000-4000-8000-000000000006', 'Andrés L.', '20 minutos de movimiento cambiaron mi humor', 'accion', ARRAY['health', 'discipline'], 'book', 'Robin Sharma — The 5AM Club',
   'Moverme primero me dio la energía que buscaba en el café y el celular.', '¿Qué fue lo que más resonó contigo?',
   'Caminar 20 minutos antes de revisar mensajes, cuatro días por semana.', '[{"title":"Caminar 20 minutos al despertar","minutes":20}]',
   'community', NULL, 35, 19, TRUE, NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- (moments_v2) bloques ejecutables de los Moments demo
-- =====================================================
-- Demo: los Moments de ejemplo con bloques ejecutables y tipo (requiere 0009).
-- Idempotente. Se incluye al final de seed.sql y de seed_production.sql;
-- en una base que ya tenía el demo se puede ejecutar por separado.
-- =====================================================
UPDATE public.soi_blueprints SET kind = 'recovery', blocks = '[
  {"id":"b1","type":"breathing","title":"Respira y vuelve al cuerpo","minutes":1,"config":{"inhale":4,"exhale":6}},
  {"id":"b2","type":"affirmation","title":"Hoy va a ser un buen día","minutes":1,"config":{"text":"Hoy va a ser el mejor día de todos.","repeat":1},"source":"Brian Tracy — Eat That Frog!"},
  {"id":"b3","type":"writing","title":"La única tarea que haría el día mejor","minutes":1,"config":{"prompt":"¿Cuál es la única tarea que, si la haces hoy, haría tu día mejor?"},"source":"Brian Tracy — Eat That Frog!"},
  {"id":"b4","type":"timer","title":"Empiézala 2 minutos","minutes":2,"config":{"instruction":"Haz esa tarea solo dos minutos, aunque no la termines."}}
]'::jsonb WHERE id = 'b1000000-0000-4000-8000-000000000001';

UPDATE public.soi_blueprints SET kind = 'daily', blocks = '[
  {"id":"b1","type":"meditation","title":"Silencio","minutes":3,"config":{"guide":"Siéntate cómodo, cierra los ojos y respira lento."},"source":"Hal Elrod — The Miracle Morning"},
  {"id":"b2","type":"affirmation","title":"Afirmación del día","minutes":3,"config":{"text":"Soy una persona que cumple lo que se propone.","repeat":3},"source":"Hal Elrod — The Miracle Morning"},
  {"id":"b3","type":"visualization","title":"Tu día ideal","minutes":4,"config":{"scene":"Imagina tu día saliendo bien: cómo te mueves, cómo hablas, cómo te sientes al terminar."},"source":"Hal Elrod — The Miracle Morning"},
  {"id":"b4","type":"reading","title":"Lee 5 páginas","minutes":5,"config":{"book":"Un libro que te haga crecer","pages":5},"source":"Hal Elrod — The Miracle Morning"},
  {"id":"b5","type":"goal","title":"3 metas y la acción de hoy","minutes":5,"config":{"prompt":"Escribe tu meta más importante en presente."},"source":"Brian Tracy — Goals!"}
]'::jsonb WHERE id = 'b1000000-0000-4000-8000-000000000002';

UPDATE public.soi_blueprints SET kind = 'growth', blocks = '[
  {"id":"b1","type":"emotion_log","title":"¿Cómo te sientes con el dinero hoy?","minutes":1,"config":{"question":"¿Cómo te sientes con tu dinero ahora mismo?"}},
  {"id":"b2","type":"checklist","title":"Revisión de la semana","minutes":4,"config":{"items":["Revisa los gastos de la semana sin juzgarte","Marca uno que no te acercó a tu meta","Anota cuánto ahorraste"]}},
  {"id":"b3","type":"reflection","title":"La creencia que apareció","minutes":2,"config":{"question":"¿Qué creencia sobre el dinero apareció mientras revisabas?"},"source":"Napoleon Hill — Think and Grow Rich"},
  {"id":"b4","type":"next_step","title":"El ahorro de la próxima semana","minutes":2,"config":{"instruction":"Define cuánto vas a ahorrar la próxima semana."}},
  {"id":"b5","type":"celebration","title":"Lo hiciste","minutes":1,"config":{"message":"Mirar tu dinero de frente ya es un cambio."}}
]'::jsonb WHERE id = 'b1000000-0000-4000-8000-000000000003';
