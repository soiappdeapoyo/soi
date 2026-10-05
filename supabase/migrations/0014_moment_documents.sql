-- =====================================================
-- 0014 — Aditiva. Documentos PDF como acción de los Moments.
--  • moment-assets admite application/pdf: los PDF que un creador sube para su Moment
--    (o la copia que SOI hace al publicar uno de su biblioteca) en "<uid>/docs/<uuid>.pdf".
--    La biblioteca personal (bucket "library") sigue siendo privada.
-- =====================================================
UPDATE storage.buckets
SET allowed_mime_types = ARRAY(SELECT DISTINCT unnest(allowed_mime_types || ARRAY['application/pdf']))
WHERE id = 'moment-assets' AND NOT ('application/pdf' = ANY(allowed_mime_types));
