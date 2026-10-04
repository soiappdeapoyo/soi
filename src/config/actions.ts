import { z } from 'zod/v3';
import type { Eslabon } from '@/config/agents';

/**
 * Biblioteca de acciones: las piezas con las que se componen los SOI Moments.
 * Cada tipo tiene su runner ejecutable en `src/components/moments/blocks/`.
 * Núcleo v1: 16 acciones + 2 estructurales (próximo paso y Moment anidado).
 */

const text = (max: number) => z.string().trim().min(1).max(max);

export const ACTION_CONFIG = {
  breathing: z.object({ inhale: z.number().int().min(2).max(8).default(4), exhale: z.number().int().min(2).max(10).default(6) }),
  meditation: z.object({ guide: text(600) }),
  timer: z.object({ instruction: text(400) }),
  writing: z.object({ prompt: text(300) }),
  visualization: z.object({ scene: text(400) }),
  checklist: z.object({ items: z.array(text(120)).min(1).max(10) }),
  video: z.object({
    videoId: z.string().min(3).max(32).optional(),
    title: z.string().max(200).optional(),
    channel: z.string().max(120).optional(),
    thumbnail: z.string().max(400).optional(),
    query: z.string().max(120).optional(),
  }).refine((c) => c.videoId || c.query, { message: 'Un video necesita videoId o query' }),
  walk: z.object({ instruction: z.string().trim().max(300).default('Camina sin el teléfono en la mano. Respira y observa.') }),
  gratitude: z.object({ count: z.number().int().min(1).max(5).default(3) }),
  reading: z.object({ book: text(160), pages: z.number().int().min(1).max(100).optional() }),
  reflection: z.object({ question: text(300) }),
  affirmation: z.object({ text: text(240), repeat: z.number().int().min(1).max(10).default(3) }),
  goal: z.object({ prompt: text(240) }),
  emotion_log: z.object({ question: z.string().trim().max(200).default('¿Cómo te sientes ahora?') }),
  rest: z.object({ instruction: text(300), variant: z.enum(['rest', 'stretching']).default('rest') }),
  celebration: z.object({ message: z.string().trim().max(200).default('Lo hiciste. Esto también es evidencia.') }),
  next_step: z.object({ instruction: text(240) }),
  moment: z.object({ momentId: z.string().uuid().optional(), slug: z.string().max(60).optional() })
    .refine((c) => c.momentId || c.slug, { message: 'Un Moment anidado necesita momentId o slug' }),
} as const;

export type ActionType = keyof typeof ACTION_CONFIG;
export const ACTION_TYPES = Object.keys(ACTION_CONFIG) as [ActionType, ...ActionType[]];

/** Qué produce cada acción al ejecutarse (se guarda en moment_runs.outputs). */
export type ActionOutput = 'none' | 'text' | 'list' | 'checks' | 'mood';

export const ACTIONS: Record<ActionType, { label: string; icon: string; minutes: number; eslabon: Eslabon; output: ActionOutput; hint: string }> = {
  breathing: { label: 'Respiración', icon: 'Wind', minutes: 2, eslabon: 'emocion', output: 'none', hint: 'Inhala y exhala a un ritmo guiado' },
  meditation: { label: 'Meditación', icon: 'Brain', minutes: 5, eslabon: 'emocion', output: 'none', hint: 'Una guía breve para calmar la mente' },
  timer: { label: 'Temporizador', icon: 'Timer', minutes: 5, eslabon: 'accion', output: 'none', hint: 'Una instrucción con tiempo' },
  writing: { label: 'Escritura', icon: 'PenLine', minutes: 5, eslabon: 'pensamiento', output: 'text', hint: 'Escribe a partir de una pregunta' },
  visualization: { label: 'Visualización', icon: 'Eye', minutes: 3, eslabon: 'emocion', output: 'none', hint: 'Imagina una escena con detalle' },
  checklist: { label: 'Checklist', icon: 'ListChecks', minutes: 3, eslabon: 'accion', output: 'checks', hint: 'Pasos para marcar' },
  video: { label: 'Video', icon: 'CirclePlay', minutes: 8, eslabon: 'emocion', output: 'none', hint: 'Inspiración dentro de SOI' },
  walk: { label: 'Caminar', icon: 'Footprints', minutes: 10, eslabon: 'accion', output: 'none', hint: 'Mueve el cuerpo, despeja la mente' },
  gratitude: { label: 'Gratitud', icon: 'Heart', minutes: 3, eslabon: 'emocion', output: 'list', hint: 'Escribe cosas por las que agradeces' },
  reading: { label: 'Lectura', icon: 'BookOpen', minutes: 10, eslabon: 'pensamiento', output: 'none', hint: 'Unas páginas de un libro' },
  reflection: { label: 'Reflexión', icon: 'MessageCircle', minutes: 3, eslabon: 'pensamiento', output: 'text', hint: 'Una sola pregunta poderosa' },
  affirmation: { label: 'Afirmación', icon: 'Sparkles', minutes: 2, eslabon: 'pensamiento', output: 'none', hint: 'Declárala en voz alta' },
  goal: { label: 'Objetivo', icon: 'Target', minutes: 3, eslabon: 'resultado', output: 'text', hint: 'Define una meta concreta' },
  emotion_log: { label: 'Registro emocional', icon: 'Smile', minutes: 1, eslabon: 'emocion', output: 'mood', hint: 'Nombra cómo te sientes' },
  rest: { label: 'Descanso', icon: 'Coffee', minutes: 3, eslabon: 'emocion', output: 'none', hint: 'Pausa o estiramiento' },
  celebration: { label: 'Celebración', icon: 'PartyPopper', minutes: 1, eslabon: 'resultado', output: 'none', hint: 'Reconoce lo que hiciste' },
  next_step: { label: 'Próximo paso', icon: 'ArrowRight', minutes: 2, eslabon: 'accion', output: 'text', hint: 'La acción concreta que sigue' },
  moment: { label: 'Otro Moment', icon: 'Layers', minutes: 0, eslabon: 'accion', output: 'none', hint: 'Reutiliza un Moment como bloque' },
};

export const MomentKindSchema = z.enum(['daily', 'recovery', 'growth', 'learning', 'challenge', 'community']);
export type MomentKind = z.infer<typeof MomentKindSchema>;

export const MOMENT_KINDS: Record<MomentKind, { label: string; hint: string }> = {
  daily: { label: 'Diarios', hint: 'Se repiten cada día' },
  recovery: { label: 'Recuperación', hint: 'Para ansiedad, tristeza, estrés o falta de enfoque' },
  growth: { label: 'Crecimiento', hint: 'Riqueza, liderazgo, disciplina, comunicación' },
  learning: { label: 'Aprendizaje', hint: 'Basados en un libro, conferencia o video' },
  challenge: { label: 'Retos', hint: 'Secuencias de varios días' },
  community: { label: 'Comunidad', hint: 'Creados por la comunidad' },
};

const baseBlock = {
  id: z.string().min(1).max(40),
  title: z.string().trim().min(2).max(120),
  minutes: z.number().int().min(0).max(120),
  /** Duración exacta cuando el paso dura menos de un minuto (p. ej. 15 s). */
  seconds: z.number().int().min(5).max(7200).optional(),
  /** Autor y obra de la técnica (Regla: toda rutina cita su fuente). */
  source: z.string().trim().max(160).optional(),
};

export const ActionBlockSchema = z.discriminatedUnion('type', ACTION_TYPES.map((t) =>
  z.object({ ...baseBlock, type: z.literal(t), config: ACTION_CONFIG[t] as z.ZodTypeAny }),
) as unknown as [z.ZodDiscriminatedUnionOption<'type'>, ...z.ZodDiscriminatedUnionOption<'type'>[]]);

export type ActionBlock = {
  id: string; type: ActionType; title: string; minutes: number; seconds?: number; source?: string;
  config: Record<string, unknown>;
};

export const ActionBlocksSchema = z.array(ActionBlockSchema).min(1).max(20);

/** Valida y aplica los valores por defecto de cada config. Devuelve los bloques válidos y los errores. */
export function parseBlocks(input: unknown): { blocks: ActionBlock[]; errors: string[] } {
  const parsed = z.array(z.unknown()).max(20).safeParse(input);
  if (!parsed.success) return { blocks: [], errors: ['Los bloques deben ser una lista (máximo 20).'] };
  const blocks: ActionBlock[] = [];
  const errors: string[] = [];
  parsed.data.forEach((raw, i) => {
    const type = (raw as { type?: unknown } | null)?.type;
    if (typeof type !== 'string' || !(type in ACTION_CONFIG)) { errors.push(`Bloque ${i + 1}: tipo de acción desconocido.`); return; }
    const r = ActionBlockSchema.safeParse(raw);
    if (r.success) blocks.push(r.data as ActionBlock);
    else errors.push(`Bloque ${i + 1}: ${r.error.issues[0]?.message ?? 'inválido'}`);
  });
  return { blocks, errors };
}

export function blockSeconds(b: Pick<ActionBlock, 'minutes' | 'seconds'>) {
  return b.seconds ?? b.minutes * 60;
}

export function newBlockId() {
  return Math.random().toString(36).slice(2, 10);
}

/** Bloque nuevo con la config por defecto del tipo (para el constructor). */
export function defaultBlock(type: ActionType): ActionBlock {
  const defaults: Partial<Record<ActionType, Record<string, unknown>>> = {
    meditation: { guide: 'Cierra los ojos y lleva la atención a tu respiración.' },
    timer: { instruction: 'Haz esta acción con toda tu atención.' },
    writing: { prompt: '¿Qué está pasando por tu mente ahora?' },
    visualization: { scene: 'Imagina tu día saliendo bien, con detalle.' },
    checklist: { items: ['Primer paso'] },
    video: { query: 'Brian Tracy motivación español' },
    reading: { book: 'Un libro que te inspire' },
    reflection: { question: '¿Qué idea quieres convertir en parte de tu vida?' },
    affirmation: { text: 'Soy una persona que termina lo que empieza.' },
    goal: { prompt: '¿Qué quieres lograr esta semana?' },
    rest: { instruction: 'Suelta los hombros y descansa la vista.' },
    next_step: { instruction: 'La acción más pequeña que puedes hacer hoy.' },
    moment: { slug: 'brian_tracy_5min' },
  };
  const config = ACTION_CONFIG[type].parse(defaults[type] ?? {}) as Record<string, unknown>;
  return { id: newBlockId(), type, title: ACTIONS[type].label, minutes: ACTIONS[type].minutes, config };
}
