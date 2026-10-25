import { z } from 'zod/v3';
import type { EmotionEvent, EmotionLabel, EmotionSnapshot } from './emotion';

/**
 * Debrief al terminar una sesión: puntuaciones por habilidad (la IA, con respaldo por reglas), la línea de emociones
 * del personaje turno a turno con su causa y los puntos ciegos (cambios claros que la persona no leyó). Lo
 * determinista vive aquí: puro y testeable.
 */

export const SKILLS = [
  { id: 'apertura', label: 'Apertura' },
  { id: 'curiosidad', label: 'Curiosidad' },
  { id: 'reciprocidad', label: 'Reciprocidad' },
  { id: 'respeto', label: 'Respeto' },
  { id: 'lectura', label: 'Lectura de señales' },
  { id: 'cierre', label: 'Cierre' },
] as const;
export type SkillId = (typeof SKILLS)[number]['id'];

export const CoachSchema = z.object({
  scores: z.object({
    apertura: z.number().int().min(1).max(5),
    curiosidad: z.number().int().min(1).max(5),
    reciprocidad: z.number().int().min(1).max(5),
    respeto: z.number().int().min(1).max(5),
    lectura: z.number().int().min(1).max(5),
    cierre: z.number().int().min(1).max(5),
  }),
  summary: z.string().max(400),
  highlights: z.array(z.object({ quote: z.string().max(200), why: z.string().max(200) })).max(3),
  improvements: z.array(z.string().max(220)).max(3),
  rewrite: z.object({ original: z.string().max(300), alternatives: z.array(z.string().max(220)).max(2), why: z.string().max(220) }).nullable(),
});
export type CoachReport = z.infer<typeof CoachSchema>;

export type DebriefMessage = { role: 'user' | 'persona' | 'system'; content: string; emotion?: EmotionSnapshot | null };

export type TimelinePoint = { turn: number; label: EmotionLabel; trend: 'up' | 'down' | 'flat'; cause: string | null };
export type BlindSpot = { turn: number; persona: string; next: string | null; tip: string };

export type DebriefReport = CoachReport & { timeline: TimelinePoint[]; blindSpots: BlindSpot[]; source: 'ai' | 'rules' };

const CAUSE: Partial<Record<EmotionEvent, string>> = {
  asked_about_her: 'preguntaste por algo suyo',
  shared_self: 'compartiste algo tuyo',
  self_centered: 'hablaste solo de ti',
  generic: 'un mensaje genérico',
  humor: 'hubo humor',
  premature_compliment: 'un cumplido físico demasiado pronto',
  too_long: 'un mensaje muy largo',
  boundary_crossed: 'se cruzó un límite',
  insisted_after_no: 'insististe después de un no',
  reentry: 'volviste tras varios días',
  ignored: 'su mensaje se quedó horas sin respuesta',
  reacted: 'reaccionaste a lo que contó',
};

const score = (s: EmotionSnapshot) => s.valence * 0.4 + s.openness * 0.4 + s.trust * 0.2;

/** Turno = cada mensaje de la persona. La emoción guardada en ese mensaje es la del personaje después de leerlo. */
export function emotionTimeline(messages: DebriefMessage[]): TimelinePoint[] {
  const points: TimelinePoint[] = [];
  let turn = 0;
  let prev: EmotionSnapshot | null = null;
  for (const m of messages) {
    if (m.role !== 'user') continue;
    turn += 1;
    if (!m.emotion) continue;
    const d = prev ? score(m.emotion) - score(prev) : 0;
    const trend = d > 0.04 ? 'up' : d < -0.04 ? 'down' : 'flat';
    const cause = m.emotion.events.map((e) => CAUSE[e]).find(Boolean) ?? null;
    points.push({ turn, label: m.emotion.label, trend, cause });
    prev = m.emotion;
  }
  return points;
}

const ACKNOWLEDGES = /\?|perdon|disculpa|tienes razon|entiendo|ok,? (te dejo|hablamos)|no te preocupes|cuando puedas|tranqui|sin presion/;
const strip = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Puntos ciegos (máx. 2): la apertura del personaje cayó con claridad y el siguiente mensaje de la persona no lo
 * reconoció (ni una pregunta, ni bajar el ritmo, ni dar espacio).
 */
export function blindSpots(messages: DebriefMessage[]): BlindSpot[] {
  const out: BlindSpot[] = [];
  let turn = 0;
  let prevOpen: number | null = null;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]!;
    if (m.role !== 'user') continue;
    turn += 1;
    const open = m.emotion?.openness ?? null;
    if (open !== null && prevOpen !== null && prevOpen - open >= 0.15) {
      const reply = messages.slice(i + 1).find((x) => x.role === 'persona');
      const next = messages.slice(i + 1).find((x) => x.role === 'user') ?? null;
      if (reply && (!next || !ACKNOWLEDGES.test(strip(next.content)))) {
        out.push({
          turn,
          persona: reply.content.slice(0, 160),
          next: next?.content.slice(0, 160) ?? null,
          tip: next ? 'Su respuesta se enfrió y seguiste igual. Una pregunta por lo suyo o bajar el ritmo habría ayudado.' : 'Su respuesta se enfrió. Leerlo a tiempo es la habilidad: preguntar por lo suyo o dar espacio.',
        });
        if (out.length >= 2) break;
      }
    }
    if (open !== null) prevOpen = open;
  }
  return out;
}

/** Sin IA: puntuaciones por reglas a partir de lo que pasó turno a turno. */
export function ruleReport(messages: DebriefMessage[]): CoachReport {
  const users = messages.filter((m) => m.role === 'user');
  const events = users.flatMap((m) => m.emotion?.events ?? []);
  const n = Math.max(1, users.length);
  const count = (e: EmotionEvent) => events.filter((x) => x === e).length;
  const clamp = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
  const first = users[0]?.content ?? '';
  const last = users[users.length - 1]?.content ?? '';
  return {
    scores: {
      apertura: clamp(first.length > 25 || /\?/.test(first) ? 4 : 2),
      curiosidad: clamp(1 + (count('asked_about_her') / n) * 6),
      reciprocidad: clamp(3 + count('shared_self') - count('self_centered')),
      respeto: clamp(5 - count('boundary_crossed') * 2 - count('insisted_after_no') * 3 - count('premature_compliment')),
      lectura: clamp(4 - blindSpots(messages).length - count('too_long')),
      cierre: clamp(/(nos vemos|hablamos|me dio gusto|buen(a|o)s? (noche|dia|tarde)|cuidate|te dejo)/i.test(last) ? 4 : 2),
    },
    summary: count('asked_about_her') >= n / 3
      ? 'Mostraste interés real por la otra persona. Sigue equilibrando: preguntar y también contar algo tuyo.'
      : 'La conversación se apoyó mucho en ti. Prueba con más preguntas abiertas sobre lo que a la otra persona le importa.',
    highlights: [],
    improvements: [
      ...(count('self_centered') ? ['Después de contar algo tuyo, devuelve la pregunta.'] : []),
      ...(count('generic') ? ['Cambia el «hola, ¿qué tal?» por algo concreto de su perfil.'] : []),
      ...(count('premature_compliment') ? ['Los cumplidos sobre su físico al inicio restan: elogia algo que dijo o hace.'] : []),
    ].slice(0, 3),
    rewrite: null,
  };
}

export const SKILL_LABEL: Record<SkillId, string> = Object.fromEntries(SKILLS.map((s) => [s.id, s.label])) as Record<SkillId, string>;

/** Mínimo de mensajes propios para que el debrief tenga algo que decir. */
export const MIN_DEBRIEF_MESSAGES = 3;
