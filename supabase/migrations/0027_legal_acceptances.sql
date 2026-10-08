-- =====================================================
-- 0027 — Aditiva. Consentimiento legal (/consentimiento): aceptación de los términos y el aviso de privacidad
-- y declaración de ser mayor de 18 años.
--  • legal_acceptances: un registro por aceptación (nunca se edita ni se borra). Guarda las versiones aceptadas
--    de legal_documents (null = la plantilla base), el texto exacto de cada declaración, IP y navegador.
--    Copia correo y nombre: la constancia sobrevive aunque la cuenta se elimine (user_id pasa a null).
--  • Lo escribe solo el servidor (service role) tras validar la sesión; cada persona puede leer las suyas.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.legal_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  display_name TEXT,
  terms_version UUID REFERENCES public.legal_documents(id) ON DELETE SET NULL,
  privacy_version UUID REFERENCES public.legal_documents(id) ON DELETE SET NULL,
  privacy_short_version UUID REFERENCES public.legal_documents(id) ON DELETE SET NULL,
  accepted_terms BOOLEAN NOT NULL CHECK (accepted_terms),
  confirmed_adult BOOLEAN NOT NULL CHECK (confirmed_adult),
  statements JSONB NOT NULL DEFAULT '[]'::jsonb,
  ip TEXT CHECK (char_length(ip) <= 100),
  user_agent TEXT CHECK (char_length(user_agent) <= 500),
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON public.legal_acceptances (user_id, accepted_at DESC);
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_at ON public.legal_acceptances (accepted_at DESC);

ALTER TABLE public.legal_acceptances ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legal_acceptances FROM anon, authenticated;
GRANT SELECT ON public.legal_acceptances TO authenticated;

DROP POLICY IF EXISTS legal_acceptances_select_own ON public.legal_acceptances;
CREATE POLICY legal_acceptances_select_own ON public.legal_acceptances
  FOR SELECT TO authenticated USING (user_id = auth.uid());
