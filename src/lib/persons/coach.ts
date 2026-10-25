import type { EmotionEvent, EmotionSnapshot } from './emotion';

/**
 * El coach como una conversación: un contacto más («Ale · tu coach») con el que hablas de cada práctica. Mientras
 * chateas con un personaje, va dejando ideas sobre lo que acaba de pasar (cada `TIP_EVERY` mensajes tuyos); puedes
 * preguntarle cómo mejorar o qué contestar; y al terminar la sesión te deja el feedback completo como tarjeta.
 * Lo determinista vive aquí (puro y testeable): cuándo toca una idea y las ideas sin IA.
 */

export const COACH_NAME = 'Ale';
export const COACH_HUE = 265;

/** Mensajes tuyos nuevos (desde la última idea) para que el coach diga algo por su cuenta. */
export const TIP_EVERY = 3;

export type PracticeLine = { role: 'user' | 'persona' | 'system'; content: string; at: string; emotion?: EmotionSnapshot | null };

/** Mensajes propios después de `uptoAt` (lo que el coach aún no comentó). */
export function newUserTurns(lines: PracticeLine[], uptoAt: string | null) {
  return lines.filter((l) => l.role === 'user' && (!uptoAt || l.at > uptoAt));
}

export function tipDue(lines: PracticeLine[], uptoAt: string | null) {
  return newUserTurns(lines, uptoAt).length >= TIP_EVERY;
}

const TIP_BY_EVENT: Partial<Record<EmotionEvent, string[]>> = {
  self_centered: ['ojo, llevas varios mensajes hablando de ti. devuélvele la pregunta, algo de lo suyo', 'vas bien contando cosas, pero pregúntale algo a la otra persona, que no sea entrevista'],
  generic: ['ese mensaje quedó muy genérico. agarra algo concreto que te haya dicho y pregunta por ahí'],
  premature_compliment: ['el cumplido sobre su físico fue muy pronto. mejor algo de lo que dice o hace'],
  too_long: ['te pasaste de largo en ese mensaje. en chat funcionan mejor 1 o 2 frases'],
  boundary_crossed: ['ahí cruzaste un límite. lo mejor ahora: reconocerlo corto, sin justificarte, y cambiar de tema'],
  insisted_after_no: ['ya te había dicho que no y volviste a insistir. respeta el no, eso suma más que cualquier frase'],
  asked_about_her: ['bien ahí preguntando por lo suyo 👌 ahora cuenta algo tuyo relacionado para que sea ida y vuelta'],
  humor: ['el humor le cayó bien, se nota. no lo fuerces, úsalo cuando salga'],
  shared_self: ['contaste algo tuyo, eso abre. fíjate si te responde igual de abierto'],
};
const PRIORITY: EmotionEvent[] = ['insisted_after_no', 'boundary_crossed', 'premature_compliment', 'self_centered', 'too_long', 'generic', 'asked_about_her', 'humor', 'shared_self'];

/** Sin IA: una idea según lo que más pesó en tus últimos mensajes (y si se enfrió la charla). */
export function ruleTip(turns: PracticeLine[], rand: () => number = Math.random): string {
  const events = turns.flatMap((t) => t.emotion?.events ?? []);
  const top = PRIORITY.find((e) => events.includes(e));
  const first = turns[0]?.emotion?.openness;
  const last = turns[turns.length - 1]?.emotion?.openness;
  if (!top && first !== undefined && last !== undefined && first - last >= 0.15) {
    return 'siento que la plática se enfrió un poco. prueba bajar el ritmo o preguntarle cómo va su día';
  }
  const list = (top && TIP_BY_EVENT[top]) || ['va fluyendo. un tip: haz preguntas abiertas (qué, cómo) en vez de sí o no'];
  return list[Math.floor(rand() * list.length) % list.length]!;
}

/** Atajos para preguntarle algo de un toque. */
export const COACH_PROMPTS = ['¿cómo voy?', '¿qué le contesto?', '¿por qué se enfrió?', 'dame feedback de la sesión'] as const;
export const FEEDBACK_PROMPT = COACH_PROMPTS[3];
