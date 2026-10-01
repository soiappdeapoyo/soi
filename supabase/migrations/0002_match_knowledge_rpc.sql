CREATE OR REPLACE FUNCTION public.match_knowledge(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_user_id UUID DEFAULT NULL,
  filter_categories TEXT[] DEFAULT NULL
)
RETURNS TABLE (id UUID, category TEXT, title TEXT, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql STABLE AS $$
BEGIN
  RETURN QUERY
  SELECT k.id, k.category, k.title, k.content, k.metadata,
    1 - (k.embedding <=> query_embedding) AS similarity
  FROM public.agent_knowledge k
  WHERE (filter_user_id IS NULL OR k.user_id = filter_user_id)
    AND (filter_categories IS NULL OR k.category = ANY(filter_categories))
    AND k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) > match_threshold
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
