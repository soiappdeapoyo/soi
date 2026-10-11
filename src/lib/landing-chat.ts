import type { ActionType } from '@/config/actions';

/**
 * Chat de la landing (sin cuenta): la persona cuenta qué le pasa, SOI pregunta lo justo y le diseña su primer Moment.
 * Al tocar Comenzar va a entrar; el Moment queda guardado como borrador (`moment_drafts`) y, al iniciar sesión,
 * `/m/borrador/<token>` lo vuelve suyo y abre el reproductor. Reglas puras (sin IA), testeadas.
 */

export type LandingAuthor = 'neville' | 'tracy' | 'hill';
export type LandingMessage = { role: 'user' | 'assistant'; text: string };

/** Mensajes propios como máximo: al llegar, SOI diseña con lo que tenga (cuida el costo y no alarga la espera). */
export const LANDING_MAX_USER_MESSAGES = 4;
export const LANDING_MAX_CHARS = 600;

/** Acciones que un Moment de la landing puede usar: sin medios, libros, videos ni documentos (no hay cuenta aún). */
export const LANDING_BLOCK_TYPES = [
  'breathing', 'body_scan', 'meditation', 'visualization', 'affirmation', 'reframe', 'writing', 'reflection',
  'gratitude', 'letter', 'goal', 'emotion_log', 'walk', 'rest', 'timer', 'next_step', 'celebration',
] as const satisfies readonly ActionType[];

/** Quiere el Moment ya, sin más preguntas. */
const HURRY = /\b(ya|rapido|rápido|hazlo|diséñalo|disenalo|dámelo|damelo|lo que sea|sorpréndeme|sorprendeme|no se|no sé)\b/i;

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/**
 * ¿Pregunta o diseña? Escuchar primero, pero sin interrogatorio: con un mensaje muy concreto (≥ 25 palabras) diseña
 * de una vez; si no, una pregunta y diseña con la segunda respuesta (o antes si pide que sea ya).
 */
export function landingPhase(messages: LandingMessage[]): 'ask' | 'design' {
  const mine = messages.filter((m) => m.role === 'user');
  if (!mine.length) return 'ask';
  const total = mine.reduce((a, m) => a + words(m.text), 0);
  const last = mine[mine.length - 1]!.text;
  if (mine.length >= 2 || total >= 25 || (mine.length >= 1 && messages.some((m) => m.role === 'assistant') && HURRY.test(last))) return 'design';
  return 'ask';
}

/** Historial que llega del navegador: solo roles válidos, recortado, empieza en la persona, sin pasarse del tope. */
export function cleanHistory(input: unknown): LandingMessage[] | null {
  if (!Array.isArray(input) || input.length > LANDING_MAX_USER_MESSAGES * 2 + 1) return null;
  const out: LandingMessage[] = [];
  for (const raw of input) {
    const m = raw as { role?: unknown; text?: unknown } | null;
    if ((m?.role !== 'user' && m?.role !== 'assistant') || typeof m.text !== 'string') return null;
    const text = m.text.trim().slice(0, LANDING_MAX_CHARS);
    if (text) out.push({ role: m.role, text });
  }
  const first = out.findIndex((m) => m.role === 'user');
  const history = first < 0 ? [] : out.slice(first);
  const mine = history.filter((m) => m.role === 'user').length;
  if (!mine || mine > LANDING_MAX_USER_MESSAGES || history[history.length - 1]!.role !== 'user') return null;
  return history;
}

export function landingAuthor(v: unknown): LandingAuthor | null {
  return v === 'neville' || v === 'tracy' || v === 'hill' ? v : null;
}

/** Frases para empezar de un toque (según el autor del video, si se sabe). */
export function landingStarters(de: LandingAuthor | null): string[] {
  const byAuthor: Record<LandingAuthor, string> = {
    neville: 'Quiero sentir que lo que deseo ya es mío',
    tracy: 'Quiero dejar de postergar lo importante',
    hill: 'Quiero tener claro qué quiero en mi vida',
  };
  const base = ['Tengo ansiedad y no puedo parar mi mente', 'Siento que no avanzo', 'Quiero empezar el día con energía'];
  return de ? [byAuthor[de], ...base.slice(0, 2)] : base;
}

/** Destino tras entrar: guarda el Moment y lo abre. */
export const draftPath = (token: string) => `/m/borrador/${token}`;
export const draftLoginHref = (token: string) => `/login?next=${encodeURIComponent(draftPath(token))}`;

/** Paso tal como lo escribe la IA: un solo texto por paso (más robusto entre proveedores que un `config` libre). */
export type LandingStep = {
  type: (typeof LANDING_BLOCK_TYPES)[number]; title: string; minutes: number; text?: string | null;
  pattern?: 'calma' | 'caja' | '478' | 'coherencia' | null; source?: string | null;
};

/** El texto de cada paso → el `config` de su acción (luego lo valida `parseBlocks`). */
export function stepConfig(s: LandingStep): Record<string, unknown> {
  const t = s.text?.trim() || undefined;
  switch (s.type) {
    case 'breathing': return { pattern: s.pattern ?? 'calma' };
    case 'body_scan': return {};
    case 'meditation': return { guide: t };
    case 'visualization': return { scene: t };
    case 'affirmation': return { text: t, repeat: 3 };
    case 'reframe': return t ? { thought: t } : {};
    case 'writing': case 'goal': return { prompt: t };
    case 'reflection': return { question: t };
    case 'gratitude': return { count: 3 };
    case 'letter': return t ? { prompt: t } : {};
    case 'emotion_log': return t ? { question: t } : {};
    case 'celebration': return t ? { message: t } : {};
    default: return { instruction: t }; // walk, rest, timer, next_step
  }
}
