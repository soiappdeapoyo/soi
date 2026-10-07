-- =====================================================
-- 0026 — Aditiva. legal_documents admite el aviso de privacidad simplificado ('privacidad_corto'),
-- publicado desde /panel → Términos y mostrado en /privacidad/simplificado.
-- =====================================================

ALTER TABLE public.legal_documents DROP CONSTRAINT IF EXISTS legal_documents_kind_check;
ALTER TABLE public.legal_documents ADD CONSTRAINT legal_documents_kind_check
  CHECK (kind IN ('terminos', 'privacidad', 'privacidad_corto'));
