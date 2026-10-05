-- =====================================================
-- 0017 — Aditiva. Contenido guiado generado por los agentes como recursos de la biblioteca.
--  • library_items.kind admite 'meditation', 'affirmations' y 'manifestation'
--    (el texto completo vive en metadata; la voz se genera y cachea al escucharlo).
-- =====================================================
ALTER TABLE public.library_items DROP CONSTRAINT IF EXISTS library_items_kind_check;
ALTER TABLE public.library_items ADD CONSTRAINT library_items_kind_check
  CHECK (kind IN ('book', 'pdf', 'exercise', 'meditation', 'affirmations', 'manifestation'));
