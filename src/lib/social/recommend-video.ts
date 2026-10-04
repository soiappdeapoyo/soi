import type { SupabaseClient } from '@supabase/supabase-js';
import { searchYouTube, type YouTubeVideo } from '@/lib/integrations/youtube';
import { remember } from '@/lib/ai/rag';
import type { MomentumState } from '@/lib/momentum';

/** Consultas por estado: solo autores del marco de SOI (Regla: toda técnica cita su fuente). */
const QUERIES: Record<MomentumState, string[]> = {
  low_energy: ['Brian Tracy motivación enfoque español', 'Robin Sharma club de las 5 de la mañana español', 'Hal Elrod mañana milagrosa español'],
  anxiety: ['Joe Dispenza meditación calma español', 'Neville Goddard sentir es el secreto español'],
  confusion: ['Brian Tracy metas claridad español', 'Napoleon Hill propósito definido español'],
  high_energy: ['Napoleon Hill piense y hágase rico resumen español', 'Brian Tracy cómo lograr metas español'],
};

const WEEK = 7 * 86_400_000;

/**
 * Un video para inspirar dentro de SOI. Usa la caché `video_cache` (7 días) para no gastar cuota de YouTube
 * y evita repetir los videos vistos en los últimos 30 días.
 */
export async function recommendVideo(supabase: SupabaseClient, userId: string, state: MomentumState): Promise<YouTubeVideo | null> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const { data: seen } = await supabase.from('momentum_events').select('metadata').eq('user_id', userId)
    .eq('kind', 'video_watched').gte('created_at', since).limit(200);
  const watched = new Set((seen ?? []).map((r) => (r.metadata as { video_id?: string } | null)?.video_id).filter(Boolean));

  for (const query of QUERIES[state]) {
    const { data: cached } = await supabase.from('agent_knowledge').select('metadata, created_at')
      .eq('user_id', userId).eq('category', 'video_cache').eq('title', query)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    let videos = (cached && Date.now() - Date.parse(cached.created_at as string) < WEEK)
      ? ((cached.metadata as { videos?: YouTubeVideo[] })?.videos ?? [])
      : [];
    if (!videos.length) {
      videos = await searchYouTube(query, 5);
      if (videos.length) {
        await remember(supabase, {
          user_id: userId, category: 'video_cache', title: query,
          content: videos.map((v) => `${v.title} — ${v.channel}`).join('\n'), metadata: { videos }, withEmbedding: false,
        });
      }
    }
    const fresh = videos.find((v) => !watched.has(v.id));
    if (fresh) return fresh;
  }
  return null;
}
