import { z } from 'zod/v3';
import type { SupabaseClient } from '@supabase/supabase-js';
import { MOMENT_FIELDS, toMomentFlow, type MomentFlow } from '@/lib/moments/types';

/** Destacados: como las historias destacadas de Instagram, pero agrupan Moments por tema. */
export const HighlightSchema = z.object({
  id: z.string().regex(/^[a-z0-9]{4,16}$/),
  title: z.string().trim().min(1).max(24),
  moment_ids: z.array(z.string().uuid()).min(1).max(20),
});
export const HighlightsSchema = z.array(HighlightSchema).max(8);
export type Highlight = z.infer<typeof HighlightSchema>;

export function parseHighlights(v: unknown): Highlight[] {
  const r = HighlightsSchema.safeParse(v);
  return r.success ? r.data : [];
}

export type CreatorLayer = {
  handle: string;
  category: string | null;
  isVerified: boolean;
  moments: MomentFlow[];
  /** Personas que vivieron sus Moments (ejecuciones acumuladas). */
  people: number;
  /** Destacados con portada (la del primer Moment que la tenga) y solo Moments publicados. */
  highlights: (Highlight & { cover: string | null; moments: MomentFlow[] })[];
};

/** La capa de creador de un perfil (null si no es cuenta de creador). */
export async function loadCreatorLayer(supabase: SupabaseClient, userId: string): Promise<CreatorLayer | null> {
  const [{ data: c }, { data: rows }] = await Promise.all([
    supabase.from('creator_profiles').select('handle, category, is_verified, highlights').eq('user_id', userId).maybeSingle(),
    supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', userId).eq('status', 'published')
      .order('created_at', { ascending: false }).limit(60),
  ]);
  if (!c) return null;
  const moments = (rows ?? []).map(toMomentFlow);
  const byId = new Map(moments.map((m) => [m.id, m]));
  const highlights = parseHighlights(c.highlights).map((h) => {
    const ms = h.moment_ids.map((id) => byId.get(id)).filter(Boolean) as MomentFlow[];
    return { ...h, moments: ms, cover: ms.find((m) => m.cover)?.cover ?? null };
  }).filter((h) => h.moments.length);
  return {
    handle: c.handle as string, category: (c.category as string | null) ?? null, isVerified: Boolean(c.is_verified),
    moments, people: moments.reduce((a, m) => a + (m.executions_count ?? 0), 0), highlights,
  };
}

/** ¿Es cuenta de creador? Una cuenta de creador no usa IA para generar contenido (todo es conocimiento propio). */
export async function isCreatorAccount(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from('creator_profiles').select('user_id').eq('user_id', userId).maybeSingle();
  return Boolean(data);
}

export const CREATOR_NO_AI = 'En tu cuenta de creador todo el contenido es tuyo: SOI no lo genera con IA.';

/** Rutas que generan contenido con IA: en una cuenta de creador responden 403 con el porqué. */
export async function blockAIForCreators(supabase: SupabaseClient, userId: string): Promise<Response | null> {
  return (await isCreatorAccount(supabase, userId))
    ? Response.json({ ok: false, reason: 'creator_no_ai', message: CREATOR_NO_AI }, { status: 403 })
    : null;
}

/**
 * Bloques de un creador sin contenido generado por IA: un libro se vive leyendo páginas (no con el resumen
 * que escribe la IA). Lo demás ya es material suyo (texto, imagen, video, PDF, audio).
 */
export function creatorBlocks<T extends { type: string; config: Record<string, unknown> }>(blocks: T[]): T[] {
  return blocks.map((b) => (b.type === 'book' && b.config.mode !== 'read' ? { ...b, config: { ...b.config, mode: 'read' } } : b));
}
