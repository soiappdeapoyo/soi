import { blockSeconds, type ActionBlock } from '@/config/actions';

export type MomentRef = { momentId?: string; slug?: string };
export type Resolver = (ref: MomentRef) => Promise<ActionBlock[] | null>;

const MAX_DEPTH = 2;

function refKey(r: MomentRef) {
  return r.momentId ? `id:${r.momentId}` : `slug:${r.slug}`;
}

/**
 * Los Moments son componibles: un bloque `moment` se expande con los bloques del Moment referido.
 * Profundidad máxima 2 y sin ciclos (un Moment no puede contenerse a sí mismo). Lo que no se resuelve se omite.
 * Los ids anidados se prefijan para que las salidas de cada bloque no choquen.
 */
export async function flattenBlocks(blocks: ActionBlock[], resolve: Resolver, opts: { self?: MomentRef; depth?: number; seen?: Set<string> } = {}): Promise<ActionBlock[]> {
  const depth = opts.depth ?? 0;
  const seen = new Set(opts.seen ?? []);
  if (opts.self) seen.add(refKey(opts.self));

  const out: ActionBlock[] = [];
  for (const b of blocks) {
    if (b.type !== 'moment') { out.push(b); continue; }
    const ref = b.config as MomentRef;
    const key = refKey(ref);
    if (depth >= MAX_DEPTH || seen.has(key)) continue;
    const inner = await resolve(ref);
    if (!inner?.length) continue;
    const expanded = await flattenBlocks(inner, resolve, { depth: depth + 1, seen: new Set([...seen, key]) });
    out.push(...expanded.map((x) => ({ ...x, id: `${b.id}.${x.id}` })));
  }
  return out;
}

export function totalSeconds(blocks: Pick<ActionBlock, 'minutes' | 'seconds'>[]) {
  return blocks.reduce((a, b) => a + blockSeconds(b), 0);
}

export function totalMinutes(blocks: Pick<ActionBlock, 'minutes' | 'seconds'>[]) {
  return Math.max(1, Math.round(totalSeconds(blocks) / 60));
}
