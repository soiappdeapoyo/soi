-- =====================================================
-- 0013 — Aditiva. Portadas de Moments y Biblioteca personal.
--  • soi_blueprints.cover_path: portada del Moment. Ruta de la app ("/moments/x.webp") o de Storage
--    (moment-assets, "<uid>/cover/…"). Solo el servidor la escribe (tras moderar la imagen).
--    Las versiones guardadas (forks) heredan la portada del original.
--  • library_items: libros (Open Library), PDFs propios y ejercicios guardados. Privado por persona.
--  • content_cache: resúmenes de libros y traducciones de ejercicios generados una vez y compartidos.
--  • Storage: bucket privado "library" para PDFs (cada quien en su carpeta).
-- =====================================================

ALTER TABLE public.soi_blueprints ADD COLUMN IF NOT EXISTS cover_path TEXT;
ALTER TABLE public.soi_blueprints DROP CONSTRAINT IF EXISTS soi_blueprints_cover_path_shape;
ALTER TABLE public.soi_blueprints ADD CONSTRAINT soi_blueprints_cover_path_shape CHECK (
  cover_path IS NULL
  OR cover_path ~ '^/(moments|demo)/[a-z0-9/_-]+\.webp$'
  OR cover_path ~ '^[0-9a-f-]{36}/cover/[0-9a-f-]{36}\.(webp|jpg|png)$'
);
-- soi_blueprints usa permisos de lectura por columna (0009: premium_blocks nunca se lee): la portada sí.
GRANT SELECT (cover_path) ON public.soi_blueprints TO anon, authenticated;

-- Una versión guardada hereda la portada del original (Moment de la tabla u oficial).
CREATE OR REPLACE FUNCTION public.moment_inherit_cover()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.cover_path IS NULL THEN
    IF NEW.parent_id IS NOT NULL THEN
      SELECT cover_path INTO NEW.cover_path FROM public.soi_blueprints WHERE id = NEW.parent_id;
    ELSIF NEW.parent_slug IS NOT NULL AND NEW.parent_slug ~ '^[a-z0-9_]+$' THEN
      NEW.cover_path := '/moments/' || replace(NEW.parent_slug, '_', '-') || '.webp';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS moment_inherit_cover ON public.soi_blueprints;
CREATE TRIGGER moment_inherit_cover BEFORE INSERT ON public.soi_blueprints
  FOR EACH ROW EXECUTE FUNCTION public.moment_inherit_cover();

-- ---------- Biblioteca ----------
CREATE TABLE IF NOT EXISTS public.library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('book', 'pdf', 'exercise')),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  author TEXT CHECK (char_length(author) <= 200),
  -- book: clave de Open Library ("/works/OL…W"); exercise: id de free-exercise-db
  external_id TEXT CHECK (char_length(external_id) <= 120),
  cover_url TEXT CHECK (cover_url IS NULL OR cover_url ~ '^https://covers\.openlibrary\.org/'),
  file_path TEXT CHECK (file_path IS NULL OR file_path ~ '^[0-9a-f-]{36}/'),
  file_size INTEGER,
  status TEXT NOT NULL DEFAULT 'saved' CHECK (status IN ('saved', 'want', 'reading', 'done')),
  notes TEXT CHECK (char_length(notes) <= 2000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_library_user ON public.library_items (user_id, kind, updated_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_library_external ON public.library_items (user_id, kind, external_id) WHERE external_id IS NOT NULL;

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lib_select_own" ON public.library_items;
CREATE POLICY "lib_select_own" ON public.library_items FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "lib_insert_own" ON public.library_items;
CREATE POLICY "lib_insert_own" ON public.library_items FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "lib_update_own" ON public.library_items;
CREATE POLICY "lib_update_own" ON public.library_items FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "lib_delete_own" ON public.library_items;
CREATE POLICY "lib_delete_own" ON public.library_items FOR DELETE USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE ON public.library_items FROM anon, authenticated;
GRANT INSERT (user_id, kind, title, author, external_id, cover_url, file_path, file_size, status, notes, metadata) ON public.library_items TO authenticated;
GRANT UPDATE (status, notes, updated_at) ON public.library_items TO authenticated;
GRANT DELETE ON public.library_items TO authenticated;

-- ---------- Caché de contenido generado (compartido) ----------
CREATE TABLE IF NOT EXISTS public.content_cache (
  key TEXT PRIMARY KEY CHECK (char_length(key) <= 200),
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.content_cache ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cc_select_auth" ON public.content_cache;
CREATE POLICY "cc_select_auth" ON public.content_cache FOR SELECT TO authenticated USING (TRUE);
REVOKE INSERT, UPDATE, DELETE ON public.content_cache FROM anon, authenticated;

-- ---------- Storage: PDFs privados ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('library', 'library', FALSE, 31457280, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "library_insert_own" ON storage.objects;
CREATE POLICY "library_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'library' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "library_select_own" ON storage.objects;
CREATE POLICY "library_select_own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'library' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS "library_delete_own" ON storage.objects;
CREATE POLICY "library_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'library' AND (storage.foldername(name))[1] = auth.uid()::text);
