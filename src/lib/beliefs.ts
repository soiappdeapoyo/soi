import { z } from 'zod/v3';
import type { ActionBlock } from '@/config/actions';
import { LIFE_AREA_IDS, type LifeAreaId } from '@/config/life-areas';
import { overlap, stems } from '@/lib/ai/similarity';

/**
 * Creencias limitantes como entrenamiento mental, no como terapia (puro y testeado).
 * SOI detecta en la conversación una creencia que frena a la persona ("no soy constante"), con sus palabras; juntos
 * eligen una más útil y creíble ("soy alguien que vuelve") y se practica: cada Moment de la creencia o cada reencuadre
 * de ese mismo pensamiento suma. La creencia nueva se vuelve suya con repeticiones, no con un solo momento.
 * Base: reestructuración cognitiva (Aaron Beck, *Cognitive Therapy of Depression*, 1979) y autosugestión
 * (Napoleon Hill, *Think and Grow Rich*, 1937, cap. 4).
 * Se guarda en agent_knowledge (categoría 'pensamiento' + tag 'creencia', una fila por creencia): sin migración.
 */

export const BELIEF_TAG = 'creencia';
export const MAX_ACTIVE_BELIEFS = 5;

export type BeliefSeen = { at: string; said: string };
export type BeliefPractice = { at: string; source: 'moment' | 'reframe' | 'chat' };

export type Belief = {
  id: string;
  /** La creencia que frena, con sus palabras. */
  old: string;
  /** La creencia más útil que eligió (o propuso SOI). */
  next: string | null;
  area: LifeAreaId | null;
  seen: BeliefSeen[];
  practices: BeliefPractice[];
  /** El Moment para practicarla (se crea una vez). */
  moment_id: string | null;
  created_at: string;
};

export const BeliefInput = z.object({
  belief: z.string().trim().min(4).max(160).describe('La creencia que la frena, en primera persona y con sus palabras: «no soy constante», «el dinero no es para mí»'),
  said: z.string().trim().max(300).optional().describe('La frase exacta de la persona que la muestra'),
  replacement: z.string().trim().min(4).max(160).optional().describe('Una creencia más útil y CREÍBLE hoy (puente, no lo opuesto absoluto): «estoy aprendiendo a volver cuando lo dejo»'),
  area: z.enum(LIFE_AREA_IDS).optional(),
});
export type BeliefInputT = z.infer<typeof BeliefInput>;

/** Lee una fila de agent_knowledge (lo roto o de otra versión no rompe nada). */
export function readBelief(row: { id: string; title: string; metadata: unknown; created_at: string }): Belief {
  const m = (row.metadata ?? {}) as Partial<Belief> & { new?: string };
  const area = typeof m.area === 'string' && (LIFE_AREA_IDS as string[]).includes(m.area) ? m.area as LifeAreaId : null;
  return {
    id: row.id,
    old: typeof m.old === 'string' && m.old ? m.old : row.title,
    next: typeof m.next === 'string' && m.next.trim() ? m.next : null,
    area,
    seen: Array.isArray(m.seen) ? m.seen.filter((s) => s && typeof s.at === 'string') : [],
    practices: Array.isArray(m.practices) ? m.practices.filter((p) => p && typeof p.at === 'string') : [],
    moment_id: typeof m.moment_id === 'string' ? m.moment_id : null,
    created_at: row.created_at,
  };
}

export function beliefMetadata(b: Omit<Belief, 'id' | 'created_at'>) {
  return { old: b.old, next: b.next, area: b.area, seen: b.seen.slice(-10), practices: b.practices.slice(-100), moment_id: b.moment_id };
}

/** La misma creencia dicha de otra forma: ≥ 60 % de sus palabras con contenido en común. */
export function findSimilar(list: Belief[], text: string): Belief | null {
  const q = stems(text);
  let best: { b: Belief; s: number } | null = null;
  for (const b of list) {
    const s = Math.max(overlap(q, stems(b.old)), b.next ? overlap(q, stems(b.next)) * 0.9 : 0);
    if (s >= 0.6 && (!best || s > best.s)) best = { b, s };
  }
  return best?.b ?? null;
}

/** Registrar que apareció (de nuevo) o que eligió su creencia nueva. Puro: devuelve la creencia actualizada o una nueva. */
export function applyBeliefInput(existing: Belief | null, input: BeliefInputT, now = new Date().toISOString()): Omit<Belief, 'id' | 'created_at'> {
  const seen = input.said?.trim() ? [{ at: now, said: input.said.trim().slice(0, 300) }] : [{ at: now, said: input.belief }];
  if (!existing) {
    return { old: input.belief, next: input.replacement ?? null, area: input.area ?? null, seen, practices: [], moment_id: null };
  }
  return {
    old: existing.old,
    next: input.replacement ?? existing.next,
    area: existing.area ?? input.area ?? null,
    // Sin duplicar el mismo día.
    seen: existing.seen.some((s) => s.at.slice(0, 10) === now.slice(0, 10)) ? existing.seen : [...existing.seen, ...seen],
    practices: existing.practices,
    moment_id: existing.moment_id,
  };
}

/** Una práctica más (una por día y fuente: repetirla dos veces el mismo día no la acelera). */
export function addPractice(b: Pick<Belief, 'practices'>, source: BeliefPractice['source'], now = new Date().toISOString()): BeliefPractice[] {
  if (b.practices.some((p) => p.at.slice(0, 10) === now.slice(0, 10) && p.source === source)) return b.practices;
  return [...b.practices, { at: now, source }];
}

/**
 * Etapas por repeticiones: una creencia se debilita practicando la nueva, no discutiendo la vieja.
 * 21 días de práctica no son una ley (los hábitos tardan de 18 a 254 días, Lally y otros, 2010): es un primer hito.
 */
export const BELIEF_MILESTONE = 21;
export type BeliefStage = 'detectada' | 'entrenando' | 'creciendo' | 'tuya';
export const STAGE_LABEL: Record<BeliefStage, string> = {
  detectada: 'Detectada', entrenando: 'En entrenamiento', creciendo: 'Cada vez más tuya', tuya: 'Ya es parte de ti',
};

export function practiceDays(b: Pick<Belief, 'practices'>): number {
  return new Set(b.practices.map((p) => p.at.slice(0, 10))).size;
}

export function beliefStage(b: Pick<Belief, 'practices' | 'next'>): BeliefStage {
  const n = practiceDays(b);
  if (!b.next || n === 0) return 'detectada';
  if (n >= BELIEF_MILESTONE) return 'tuya';
  if (n >= 7) return 'creciendo';
  return 'entrenando';
}

/** La que más pide atención: la más vista que aún no es suya (a igualdad, la más reciente). */
export function activeBelief(list: Belief[]): Belief | null {
  return [...list].filter((b) => beliefStage(b) !== 'tuya')
    .sort((a, b) => b.seen.length - a.seen.length || Date.parse(b.seen.at(-1)?.at ?? b.created_at) - Date.parse(a.seen.at(-1)?.at ?? a.created_at))[0] ?? null;
}

const BECK = 'Aaron Beck — Cognitive Therapy of Depression (1979): reestructuración cognitiva';
const HILL = 'Napoleon Hill — Think and Grow Rich (1937), cap. 4: Autosugestión';

/** El Moment para practicar la creencia nueva (≈ 6 min): llegar → reencuadrar la vieja → repetir la nueva → evidencia → un gesto. */
export function beliefMomentBlocks(b: Pick<Belief, 'old' | 'next'>): ActionBlock[] {
  const next = b.next ?? 'Estoy aprendiendo a verme de otra forma';
  return [
    { id: 'arrive', type: 'breathing', title: 'Llega', minutes: 1, source: 'Respiración con exhalación prolongada', config: { pattern: 'calma' } },
    { id: 'reframe', type: 'reframe', title: 'Mira ese pensamiento', minutes: 2, source: BECK, config: { thought: b.old } },
    { id: 'say', type: 'affirmation', title: 'Tu creencia nueva', minutes: 1, source: HILL, config: { text: next, repeat: 3 } },
    { id: 'proof', type: 'reflection', title: 'Tu evidencia', minutes: 1, source: BECK,
      config: { question: `¿Qué pasó hoy, aunque sea pequeño, que demuestra que «${next}»?` } },
    { id: 'act', type: 'next_step', title: 'Un gesto de hoy', minutes: 1, source: HILL,
      config: { instruction: `¿Qué haría hoy alguien que cree «${next}»? Una sola cosa, pequeña.` } },
  ] as ActionBlock[];
}

/** Para el prompt de los agentes: la creencia activa y cómo acompañarla (datos, no instrucciones). */
export function beliefLine(b: Belief | null): string {
  if (!b) return '';
  const clean = (s: string) => s.replace(/[\r\n`<>]/g, ' ').slice(0, 160);
  return `- Creencia que está entrenando: «${clean(b.old)}»${b.next ? ` → «${clean(b.next)}» (${STAGE_LABEL[beliefStage(b)].toLowerCase()})` : ' (aún sin creencia nueva: si encaja, ayúdala a elegir una creíble)'}`;
}
