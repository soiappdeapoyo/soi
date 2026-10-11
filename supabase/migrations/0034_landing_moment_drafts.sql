-- =====================================================
-- 0034 — Aditiva. Chat de la landing: el primer Moment se diseña antes de tener cuenta.
--  • moment_drafts: el Moment que SOI diseñó para un visitante (sin cuenta). Al entrar, /m/borrador/<id>
--    lo copia a soi_blueprints (privado, de la persona) y anota claimed_by y moment_id. El id (uuid) es la llave:
--    viaja en el ?next= del login, así sobrevive al enlace mágico abierto en otro navegador.
--  • Sin acceso para clientes: escribe y lee solo el servidor (service role).
--  • purge_moment_drafts(): borra los no reclamados de más de 14 días y los reclamados de más de 30
--    (el Moment ya vive en soi_blueprints).
--  • funnel_events.event admite chat_message (escribió en el chat; detail = número de mensaje),
--    chat_moment (SOI le diseñó su Moment; detail = autor), chat_claim (entró y lo guardó; detail = autor),
--    chat_crisis (señales de crisis: recibió líneas de ayuda, sin Moment) y chat_error (no se pudo diseñar;
--    detail = limite | saturado | ia).
-- =====================================================

CREATE TABLE IF NOT EXISTS public.moment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT CHECK (char_length(visitor_id) BETWEEN 8 AND 64),
  author TEXT CHECK (author IN ('neville', 'tracy', 'hill')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 80),
  objective TEXT NOT NULL CHECK (char_length(objective) BETWEEN 1 AND 300),
  kind TEXT NOT NULL,
  source TEXT NOT NULL CHECK (char_length(source) <= 200),
  blocks JSONB NOT NULL CHECK (jsonb_typeof(blocks) = 'array'),
  context TEXT CHECK (char_length(context) <= 1000),
  part TEXT CHECK (char_length(part) <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  moment_id UUID REFERENCES public.soi_blueprints(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS moment_drafts_visitor_idx ON public.moment_drafts (visitor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moment_drafts_created_idx ON public.moment_drafts (created_at);

ALTER TABLE public.moment_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moment_drafts FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.purge_moment_drafts()
RETURNS INTEGER LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  WITH d AS (
    DELETE FROM public.moment_drafts
    WHERE (claimed_at IS NULL AND created_at < NOW() - INTERVAL '14 days')
       OR (claimed_at IS NOT NULL AND claimed_at < NOW() - INTERVAL '30 days')
    RETURNING 1
  )
  SELECT COUNT(*)::INT FROM d;
$$;
REVOKE ALL ON FUNCTION public.purge_moment_drafts() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.funnel_events DROP CONSTRAINT IF EXISTS funnel_events_event_check;
ALTER TABLE public.funnel_events ADD CONSTRAINT funnel_events_event_check
  CHECK (event IN ('landing_view', 'cta_click', 'login_view', 'auth_start', 'signup', 'login', 'film_progress', 'film_interact',
                   'chat_message', 'chat_moment', 'chat_claim', 'chat_crisis', 'chat_error'));
