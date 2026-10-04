-- =====================================================
-- 0012 — Aditiva. Perfil estilo Substack / Instagram.
--  • user_profiles.bio: biografía corta visible en tu perfil público.
--  • creator_profiles.links: hasta 5 enlaces (como Instagram). Solo creadores.
--  • Ambas se escriben SOLO desde el servidor (validación de URL y filtros); sin GRANT al cliente.
--  • get_profile_card: lo público de un perfil + contadores, sin exponer user_profiles.
-- =====================================================

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_bio_len;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_bio_len CHECK (bio IS NULL OR char_length(bio) <= 200);

ALTER TABLE public.creator_profiles ADD COLUMN IF NOT EXISTS links JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.creator_profiles DROP CONSTRAINT IF EXISTS creator_profiles_links_shape;
ALTER TABLE public.creator_profiles ADD CONSTRAINT creator_profiles_links_shape
  CHECK (jsonb_typeof(links) = 'array' AND jsonb_array_length(links) <= 5);

CREATE OR REPLACE FUNCTION public.get_profile_card(p_id UUID)
RETURNS TABLE (
  user_id UUID, display_name TEXT, avatar_url TEXT, handle TEXT, is_verified BOOLEAN,
  bio TEXT, links JSONB, followers INTEGER, following INTEGER, posts INTEGER, moments INTEGER, joined_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id,
    COALESCE(c.display_name, p.display_name, 'Alguien de SOI'),
    COALESCE(c.avatar_url, p.avatar_url),
    c.handle,
    COALESCE(c.is_verified, FALSE),
    COALESCE(NULLIF(p.bio, ''), c.bio),
    COALESCE(c.links, '[]'::jsonb),
    (SELECT COUNT(*)::INT FROM public.follows f WHERE f.followee_id = p.user_id),
    (SELECT COUNT(*)::INT FROM public.follows f WHERE f.follower_id = p.user_id),
    (SELECT COUNT(*)::INT FROM public.soi_posts s WHERE s.author_id = p.user_id AND s.parent_id IS NULL AND NOT s.flagged),
    (SELECT COUNT(*)::INT FROM public.soi_blueprints b WHERE b.creator_id = p.user_id AND b.status = 'published'),
    p.created_at
  FROM public.user_profiles p LEFT JOIN public.creator_profiles c ON c.user_id = p.user_id
  WHERE p.user_id = p_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_profile_card(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile_card(UUID) TO authenticated;
