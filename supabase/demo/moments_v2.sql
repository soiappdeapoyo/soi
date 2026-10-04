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
