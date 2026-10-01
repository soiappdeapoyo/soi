import type { SupabaseClient } from '@supabase/supabase-js';
import { embedText, toVector } from './embeddings';

export type KnowledgeCategory =
  | 'manifestacion' | 'afirmacion' | 'meditacion' | 'sueno' | 'riqueza' | 'rutina' | 'brian_tracy_journal'
  | 'perfil_usuario' | 'conversacion' | 'evidencia' | 'ritual_diario' | 'aprendizaje_web' | 'video_cache'
  | 'crisis_log' | 'comunidad_post' | 'comunidad_peticion' | 'pensamiento' | 'emocion' | 'accion' | 'resultado';

/** Escribe en la tabla maestra transversal (con embedding opcional). */
export async function remember(
  supabase: SupabaseClient,
  row: {
    user_id: string; category: KnowledgeCategory; title: string; content: string;
    metadata?: Record<string, unknown>; tags?: string[]; status?: string; withEmbedding?: boolean;
  },
) {
  const { withEmbedding = true, ...rest } = row;
  const vec = withEmbedding ? await embedText(`${row.title}\n${row.content}`) : null;
  const { data, error } = await supabase
    .from('agent_knowledge')
    .insert({ ...rest, metadata: rest.metadata ?? {}, embedding: vec ? toVector(vec) : null })
    .select('id')
    .single();
  if (error) console.error('[remember]', error.message);
  return data?.id as string | undefined;
}

/** Recupera memoria semántica del usuario (RAG). */
export async function recall(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  opts: { categories?: KnowledgeCategory[]; count?: number; threshold?: number } = {},
) {
  const vec = await embedText(query);
  if (!vec) return [];
  const { data, error } = await supabase.rpc('match_knowledge', {
    query_embedding: toVector(vec),
    match_threshold: opts.threshold ?? 0.7,
    match_count: opts.count ?? 5,
    filter_user_id: userId,
    filter_categories: opts.categories ?? null,
  });
  if (error) {
    console.error('[recall]', error.message);
    return [];
  }
  return (data ?? []) as { id: string; category: string; title: string; content: string; similarity: number }[];
}
