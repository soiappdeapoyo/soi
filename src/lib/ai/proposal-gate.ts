/**
 * Escuchar primero, proponer después. Decide por reglas (sin tokens) si en esta respuesta SOI puede proponer:
 * - listen: primer intercambio sin pedido → escucha y valida; sin herramientas de propuesta.
 * - invite: ya hay conversación → puede PREGUNTAR si quiere una propuesta ("¿Te propongo algo de 3 minutos?"), no crearla.
 * - propose: la persona lo pidió, aceptó la invitación o compartió una reflexión → propone (Moment, contenido, video).
 * - soothe: ansiedad o carga fuerte → una oferta mínima de inmediato (un minuto de respiración), siempre como invitación.
 */
export type ProposalMode = 'listen' | 'invite' | 'propose' | 'soothe';

const ASK = /(prop[oó]n(me|er|es)|qu[eé] (hago|puedo hacer|me recomiendas)|dame (algo|un|una)|ay[uú]dame con (algo|un|una)|\bun moment|una (rutina|meditaci[oó]n|pr[aá]ctica|respiraci[oó]n|afirmaci[oó]n|manifestaci[oó]n|visualizaci[oó]n)|un (ejercicio|reto|ritual|plan)|hazme (otro|otra|un|una)|algo m[aá]s corto|otra cosa|\bvideos?\b|charla|quiero (empezar|hacer algo|practicar)|mi reflexi[oó]n de)/i;
const YES = /^\s*(s[ií]+\b|dale|va\b|vale|claro|ok(ay)?\b|por favor|sale|me late|hag[aá]moslo|bueno|perfecto|ad[eé]lante|venga|s[ií],)/i;
const INVITED = /(te propongo|¿quieres que te|te preparo|¿lo hacemos|¿hacemos|¿te comparto|¿te gustar[ií]a (probar|hacer|que))/i;

export function proposalMode(i: { text: string; userTurns: number; previousAssistant?: string | null; anxiety: boolean }): ProposalMode {
  if (ASK.test(i.text)) return 'propose';
  if (i.previousAssistant && INVITED.test(i.previousAssistant) && YES.test(i.text)) return 'propose';
  if (i.anxiety) return 'soothe';
  return i.userTurns >= 2 ? 'invite' : 'listen';
}

/** Herramientas que proponen algo (se quitan al escuchar o invitar: además ahorra tokens). */
export const PROPOSAL_TOOLS = ['createMoment', 'offerMoment', 'createGuidedContent', 'youtubeSearch', 'suggestPractice'] as const;

export const PROPOSAL_RULE: Record<ProposalMode, string> = {
  listen: 'RITMO: ESCUCHA PRIMERO. En esta respuesta no propongas Moments, prácticas ni videos (no tienes esas herramientas). Valida lo que siente con sus palabras y haz UNA pregunta para entender mejor. Breve y cálida.',
  invite: 'RITMO: si sientes apertura, PIDE PERMISO en una frase al final ("¿Te propongo algo de 3 minutos para esto?"); si no, sigue escuchando. Todavía no propongas ni diseñes nada (no tienes esas herramientas): se activan cuando diga que sí o lo pida.',
  propose: 'RITMO: la persona pidió o aceptó una propuesta. Propón UNA cosa concreta (reutiliza un Moment suyo si encaja) y preséntala en una frase.',
  soothe: 'RITMO: hay carga. Primero valida en una frase. Luego OFRECE algo mínimo, como invitación y no como tarea: un Moment de 1 a 3 minutos de respiración (offerMoment o createMoment kind recovery). Nada de metas ni planes.',
};
