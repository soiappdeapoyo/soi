import { z } from 'zod/v3';

/**
 * Sistema de aprendizaje (puro y testeado): convierte información en comportamiento. Después de un libro, un video,
 * un curso o una conversación, cuatro preguntas — ¿qué aprendiste?, ¿qué significa para ti?, ¿qué harás hoy?,
 * ¿cómo sabremos que funcionó? — y, a los días, SOI vuelve a preguntar si funcionó. Lo que funcionó es evidencia;
 * lo que no, también enseña. Se guarda en agent_knowledge (categoría 'pensamiento' + tag 'aprendizaje'): sin migración.
 */

export const LEARNING_TAG = 'aprendizaje';
/** Días hasta preguntar si funcionó: lo suficiente para haberlo probado, no tanto como para olvidarlo. */
export const CHECK_AFTER_DAYS = 3;
/** Después de esto, una pregunta pendiente ya no se hace (no se persigue a nadie). */
const STALE_DAYS = 21;

export const SOURCE_KINDS = ['video', 'libro', 'pdf', 'curso', 'podcast', 'conversacion', 'otro'] as const;
export type SourceKind = (typeof SOURCE_KINDS)[number];
export const SOURCE_LABEL: Record<SourceKind, string> = {
  video: 'Un video', libro: 'Un libro', pdf: 'Un documento', curso: 'Un curso', podcast: 'Un podcast', conversacion: 'Una conversación', otro: 'Otra cosa',
};

export const LEARNING_QUESTIONS = {
  learned: '¿Qué aprendiste?',
  meaning: '¿Qué significa para ti?',
  action: '¿Qué acción harás hoy?',
  measure: '¿Cómo sabremos que funcionó?',
} as const;

export const LearningInput = z.object({
  source: z.string().trim().min(2).max(200).describe('Qué fue: título del libro, video o curso (y autor si lo sabe)'),
  kind: z.enum(SOURCE_KINDS).default('otro'),
  learned: z.string().trim().min(3).max(600),
  meaning: z.string().trim().max(600).optional(),
  action: z.string().trim().max(200).optional().describe('Una acción concreta que hará hoy'),
  measure: z.string().trim().max(200).optional().describe('Cómo sabrá que funcionó'),
});
export type LearningInputT = z.infer<typeof LearningInput>;

export const OUTCOMES = ['funciono', 'a_medias', 'no_lo_hice'] as const;
export type Outcome = (typeof OUTCOMES)[number];
export const OUTCOME_LABEL: Record<Outcome, string> = { funciono: 'Funcionó', a_medias: 'A medias', no_lo_hice: 'No lo hice' };

export const OutcomeBody = z.object({ outcome: z.enum(OUTCOMES), note: z.string().trim().max(400).optional() });

export type Learning = {
  id: string;
  source: string;
  kind: SourceKind;
  learned: string;
  meaning: string | null;
  action: string | null;
  measure: string | null;
  /** Fecha local en que SOI pregunta si funcionó (solo si hubo acción). */
  check_on: string | null;
  outcome: Outcome | null;
  outcome_note: string | null;
  created_at: string;
};

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);

export function readLearning(row: { id: string; title: string; metadata: unknown; created_at: string }): Learning {
  const m = (row.metadata ?? {}) as Record<string, unknown>;
  const kind = (SOURCE_KINDS as readonly string[]).includes(String(m.kind)) ? (m.kind as SourceKind) : 'otro';
  const outcome = (OUTCOMES as readonly string[]).includes(String(m.outcome)) ? (m.outcome as Outcome) : null;
  return {
    id: row.id, source: str(m.source) ?? row.title, kind, learned: str(m.learned) ?? '', meaning: str(m.meaning), action: str(m.action),
    measure: str(m.measure), check_on: str(m.check_on), outcome, outcome_note: str(m.outcome_note), created_at: row.created_at,
  };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function learningMetadata(input: LearningInputT, today: string) {
  return {
    source: input.source, kind: input.kind, learned: input.learned, meaning: input.meaning ?? null, action: input.action ?? null,
    measure: input.measure ?? null, check_on: input.action ? addDays(today, CHECK_AFTER_DAYS) : null, outcome: null, outcome_note: null,
  };
}

export function learningContent(l: Pick<Learning, 'learned' | 'meaning' | 'action' | 'measure'>): string {
  return [`Aprendí: ${l.learned}`, l.meaning && `Para mí significa: ${l.meaning}`, l.action && `Acción: ${l.action}`, l.measure && `Sabré que funcionó si: ${l.measure}`]
    .filter(Boolean).join('\n');
}

/** Los que toca revisar hoy (tenían acción, ya pasó su fecha, sin resultado y no tan viejos). El más antiguo primero. */
export function dueLearnings(list: Learning[], today: string): Learning[] {
  return list.filter((l) => l.action && !l.outcome && l.check_on && l.check_on <= today && addDays(l.check_on, STALE_DAYS) >= today)
    .sort((a, b) => (a.check_on! < b.check_on! ? -1 : 1));
}

/** Para el prompt de los agentes: lo que aprendió y aún no sabe si funcionó (datos, no instrucciones). */
export function learningPrompt(due: Learning[]): string {
  const l = due[0];
  if (!l) return '';
  const clean = (s: string | null, max = 160) => (s ?? '').replace(/[\r\n`<>]/g, ' ').slice(0, max);
  return `- Aprendizaje por revisar (id ${l.id}): de «${clean(l.source, 80)}» aprendió «${clean(l.learned, 140)}» y dijo que haría «${clean(l.action)}»${l.measure ? ` (sabría que funcionó si: «${clean(l.measure)}»)` : ''}. Si encaja, pregúntale si funcionó y guarda la respuesta con saveLearning (closeId).`;
}
