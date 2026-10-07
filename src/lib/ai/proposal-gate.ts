/**
 * Escuchar primero, entender, y solo entonces proponer. Decide por reglas (sin tokens) qué puede hacer SOI en esta respuesta:
 * - listen: primer intercambio sin pedido → escucha y valida; sin herramientas de propuesta.
 * - explore: pidió (o aceptó) una propuesta, pero SOI aún no sabe lo suficiente → se lo dice con calidez y hace 1–2
 *   preguntas concretas para que el Moment sea suyo y no genérico (con salida: "si prefieres algo rápido ya, dímelo").
 * - invite: ya hay conversación → si ya entiende, refleja lo entendido y PIDE PERMISO; si no, sigue preguntando.
 * - propose: lo pidió o aceptó, y ya hay entendimiento (o insiste en algo rápido) → resume lo entendido y diseña.
 * - soothe: ansiedad o carga fuerte → una oferta mínima de inmediato (1–3 min de respiración), como invitación.
 */
export type ProposalMode = 'listen' | 'explore' | 'invite' | 'propose' | 'soothe';

const ASK = /(prop[oó]n(me|er|es)|qu[eé] (hago|puedo hacer|me recomiendas)|dame (algo|un|una)|ay[uú]dame con (algo|un|una)|\bun moment|una (rutina|meditaci[oó]n|pr[aá]ctica|respiraci[oó]n|afirmaci[oó]n|manifestaci[oó]n|visualizaci[oó]n)|un (ejercicio|reto|ritual|plan)|hazme (otro|otra|un|una)|algo m[aá]s corto|otra cosa|\bvideos?\b|charla|quiero (empezar|hacer algo|practicar)|mi reflexi[oó]n de)/i;
const YES = /^\s*(s[ií]+\b|dale|va\b|vale|claro|ok(ay)?\b|por favor|sale|me late|hag[aá]moslo|bueno|perfecto|ad[eé]lante|venga|s[ií],)/i;
const INVITED = /(te propongo|¿quieres que te|te preparo|¿lo hacemos|¿hacemos|¿te comparto|¿te gustar[ií]a (probar|hacer|que))/i;
/** Quiere algo ya, sin más preguntas: se respeta. */
const INSIST = /(ya,? (solo|nada m[aá]s)|solo (dame|prop[oó]n)|r[aá]pido|sin preguntas|no quiero hablar|no me preguntes|lo que sea|cualquier cosa|ahorita|ya mismo|mi reflexi[oó]n de)/i;
/** Respuestas de un toque y frases de sistema: no cuentan como algo que contó. */
const CHIP = /^(hoy llego|proponme|sigamos con|mejor, gracias|sigue igual|hoy es otra|ahora no|eso no me|se me hizo|no era el momento|hazme otro|me hizo bien|algo me cost|quiero repetirlo|s[ií]\b|dale|ok|va\b|claro)/i;

/**
 * ¿SOI ya entiende lo suficiente para que el Moment no sea genérico? Lo que la persona contó con sus palabras:
 * al menos 2 mensajes propios y ~25 palabras (o un mensaje con algo concreto si ya hablaron del tema antes: continuidad).
 */
export function understood(userTexts: string[], hasHistory = false): boolean {
  // Un chip es una frase corta ("Sigue igual."); "Sigue igual, otra vez no pude dormir…" sí es algo que contó.
  const said = userTexts.map((t) => t.trim()).filter((t) => t.length >= 12 && !(t.length < 40 && CHIP.test(t)));
  const words = said.join(' ').split(/\s+/).filter(Boolean).length;
  return hasHistory ? said.length >= 1 && words >= 8 : said.length >= 2 && words >= 25;
}

export function proposalMode(i: {
  text: string; userTurns: number; previousAssistant?: string | null; anxiety: boolean;
  /** Mensajes de la persona en esta conversación (incluido el actual). */
  userTexts?: string[];
  /** Ya hablaron de esto antes (continuidad): basta con menos para entender. */
  hasHistory?: boolean;
}): ProposalMode {
  const wants = ASK.test(i.text) || Boolean(i.previousAssistant && INVITED.test(i.previousAssistant) && YES.test(i.text));
  const enough = understood(i.userTexts ?? [i.text], i.hasHistory) || INSIST.test(i.text);
  if (wants) return enough ? 'propose' : i.anxiety ? 'soothe' : 'explore';
  if (i.anxiety) return 'soothe';
  return i.userTurns >= 2 ? 'invite' : 'listen';
}

/** Herramientas que proponen algo (se quitan al escuchar, explorar o invitar: además ahorra tokens). */
export const PROPOSAL_TOOLS = ['createMoment', 'offerMoment', 'createGuidedContent', 'youtubeSearch', 'suggestPractice'] as const;

const ASK_WELL = 'Pregunta como alguien que de verdad quiere entender, una cosa a la vez: qué pasa exactamente (con un ejemplo de hoy), cómo lo siente (en el cuerpo, en la mente), qué le gustaría sentir o lograr al terminar, y cuánto tiempo tiene ahora y dónde está. Usa sus palabras.';

export const PROPOSAL_RULE: Record<ProposalMode, string> = {
  listen: `RITMO: ESCUCHA PRIMERO. En esta respuesta no propongas Moments, prácticas ni videos (no tienes esas herramientas). Valida lo que siente con sus palabras y haz UNA pregunta para entender mejor. ${ASK_WELL} Breve y cálida.`,
  explore: `RITMO: ENTENDER ANTES DE DISEÑAR. Pidió una propuesta, pero todavía no la conoces lo suficiente y no quieres darle algo genérico. Díselo con calidez en una frase ("Quiero que sea para ti, no algo de manual") y haz 1 o 2 preguntas concretas. ${ASK_WELL} Cierra con la salida: "Si prefieres algo rápido ya, dímelo". No tienes herramientas de propuesta en esta respuesta.`,
  invite: `RITMO: si ya entiendes qué le pasa, qué siente y qué quiere, REFLÉJALO en una frase con sus palabras ("Por lo que me cuentas, …") y PIDE PERMISO ("¿Te preparo algo pensado para eso?"). Si aún te falta, sigue preguntando. ${ASK_WELL} No propongas ni diseñes nada todavía (no tienes esas herramientas).`,
  propose: 'RITMO: ya hay permiso y entendimiento. Primero resume en UNA frase lo que entendiste ("Entiendo que …"). Luego diseña algo ÚNICO para esta persona: llena `understanding` con sus palabras y úsalas en el título y en cada paso (su situación, su meta, sus nombres, su hora, su tiempo). Nada genérico. Revisa SU BIBLIOTECA y lo que escribió en sus Moments: si uno encaja y le ayudó, ofrécelo (offerMoment); si encaja con cambios, ajústalo (basedOn); solo si ninguno sirve, crea uno nuevo (libraryCheck: por qué).',
  soothe: 'RITMO: hay carga. Primero valida en una frase. Luego OFRECE algo mínimo, como invitación y no como tarea: un Moment de 1 a 3 minutos de respiración (offerMoment o createMoment kind recovery). Nada de metas ni planes. Después, si quiere, pregunta qué pasó.',
};
