-- =====================================================
-- 0025 — Aditiva. Términos y aviso de privacidad editables desde /panel → Términos.
--  • legal_documents: cada publicación es una versión nueva (no se edita ni se borra); /terminos y /privacidad
--    muestran la más reciente. Contenido en Markdown (subido como .md, .txt o .docx y revisado en el panel).
--  • Sin acceso para anon/authenticated: lo lee y escribe el servidor con service role.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.legal_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('terminos', 'privacidad')),
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200000),
  file_name TEXT CHECK (char_length(file_name) <= 200),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legal_documents_kind ON public.legal_documents (kind, created_at DESC);
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_documents FROM anon, authenticated;
