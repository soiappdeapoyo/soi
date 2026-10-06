-- Perfil de creador estilo Instagram (un solo perfil): categoría profesional y destacados.
-- Aditiva. La verificación (is_verified) la sigue otorgando solo SOI (service role).
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.creator_profiles DROP CONSTRAINT IF EXISTS creator_profiles_category_len;
ALTER TABLE public.creator_profiles ADD CONSTRAINT creator_profiles_category_len CHECK (category IS NULL OR char_length(category) BETWEEN 2 AND 40);

-- Destacados: [{id, title, moment_ids[]}] (máx. 8; se valida también en la API).
ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS highlights JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.creator_profiles DROP CONSTRAINT IF EXISTS creator_profiles_highlights_shape;
ALTER TABLE public.creator_profiles ADD CONSTRAINT creator_profiles_highlights_shape
  CHECK (jsonb_typeof(highlights) = 'array' AND jsonb_array_length(highlights) <= 8);

GRANT INSERT (category, highlights) ON public.creator_profiles TO authenticated;
GRANT UPDATE (category, highlights) ON public.creator_profiles TO authenticated;
