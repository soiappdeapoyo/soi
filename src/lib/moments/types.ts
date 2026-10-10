import type { Eslabon } from '@/config/agents';
import type { ActionBlock, MomentKind } from '@/config/actions';

/**
 * SOI Moment: flujo inteligente, editable y reutilizable de acciones con intención,
 * inicio, final, objetivo y resultado esperado. (Tabla: soi_blueprints.)
 * Los oficiales viven en código (src/config/official-moments.ts) y se identifican por `slug`.
 */
export type MomentFlow = {
  id: string;             // uuid, o el slug en los oficiales
  slug: string | null;    // solo oficiales
  official: boolean;
  creator_id: string | null;
  author: string | null;  // autor de la técnica (oficiales) o nombre del creador
  title: string;
  objective: string;
  kind: MomentKind;
  eslabon: Eslabon;
  blocks: ActionBlock[];
  source: string;
  required_minutes: number;
  duration_days: number;
  tier: 'free' | 'premium';
  price_cents: number;
  currency: string;
  status: 'private' | 'draft' | 'published' | 'archived';
  version: number;
  parent_id: string | null;
  parent_slug: string | null;
  executions_count: number;
  forks_count: number;
  implementations_count: number;
  completions_count: number;
  is_demo: boolean;
  created_at: string;
  /** URL lista para <img> (app o Storage), o null. */
  cover: string | null;
};

export type MomentRun = {
  id: string;
  moment_id: string | null;
  moment_slug: string | null;
  version: number;
  started_at: string;
  completed_at: string | null;
  mood_before: number | null;
  mood_after: number | null;
  outputs: Record<string, unknown>;
  learning: string | null;
  helped: boolean | null;
};

export const MOMENT_FIELDS =
  'id, creator_id, title, objective, required_minutes, duration_days, difficulty, eslabon, target_states, steps, source, tier, price_cents, currency, status, implementations_count, completions_count, steps_completed_count, is_demo, created_at, kind, blocks, parent_id, parent_slug, version, executions_count, forks_count, cover_path';

/** cover_path → URL: "/…" es un archivo de la app; lo demás vive en el bucket público moment-assets. */
export function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('/')) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/moment-assets/${path}`;
}

/** Retos oficiales que comparten la foto de la práctica en la que se basan. */
const COVER_ALIAS: Record<string, string> = { reto_neville_7: 'neville_sats', reto_tracy_7: 'brian_tracy_5min' };

/** Portada de un Moment oficial (public/moments/<slug con guiones>.webp). */
export function officialCover(slug: string) {
  return `/moments/${(COVER_ALIAS[slug] ?? slug).replace(/_/g, '-')}.webp`;
}

/** Fila de soi_blueprints → MomentFlow. */
export function toMomentFlow(row: Record<string, unknown>): MomentFlow {
  return {
    id: row.id as string,
    slug: null,
    official: false,
    creator_id: (row.creator_id as string) ?? null,
    author: null,
    title: row.title as string,
    objective: row.objective as string,
    kind: (row.kind as MomentKind) ?? 'growth',
    eslabon: (row.eslabon as Eslabon) ?? 'accion',
    blocks: (row.blocks as ActionBlock[]) ?? [],
    source: row.source as string,
    required_minutes: (row.required_minutes as number) ?? 1,
    duration_days: (row.duration_days as number) ?? 1,
    tier: (row.tier as 'free' | 'premium') ?? 'free',
    price_cents: (row.price_cents as number) ?? 0,
    currency: (row.currency as string) ?? 'usd',
    status: row.status as MomentFlow['status'],
    version: (row.version as number) ?? 1,
    parent_id: (row.parent_id as string) ?? null,
    parent_slug: (row.parent_slug as string) ?? null,
    executions_count: (row.executions_count as number) ?? 0,
    forks_count: (row.forks_count as number) ?? 0,
    implementations_count: (row.implementations_count as number) ?? 0,
    completions_count: (row.completions_count as number) ?? 0,
    is_demo: Boolean(row.is_demo),
    created_at: row.created_at as string,
    cover: coverUrl(row.cover_path as string | null),
  };
}
