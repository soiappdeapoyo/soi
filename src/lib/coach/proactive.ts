/**
 * SOI te escribe primero, como un amigo o amiga (puro y testeado). Decide:
 * - si hoy toca escribir (ritmo: si no contesta varios días, escribe menos; nunca reclama),
 * - si va con nota de voz (tope diario y solo cuando vale la pena),
 * - qué tan cerca está de la persona (entre más la conoce, más personal),
 * - cómo escribe la persona (para hablarle igual) y qué le hace responder,
 * - y un mensaje por reglas, cálido y siempre distinto, si la IA no está.
 * Orden del mensaje: saludo de amigo con su nombre + una frase que motive + una pregunta. Nada de Moments al
 * principio: si la plática fluye, después SOI pregunta si quiere retomar el que le sugiere.
 */

export const VOICE_NOTES_PER_DAY = 3;
/** Mensajes suyos en la conversación antes de que SOI pueda contestar con una nota de voz. */
export const VOICE_MIN_TURNS = 4;
/** Respuestas de SOI entre una nota de voz y la siguiente dentro de la misma conversación. */
export const VOICE_GAP_TURNS = 3;

export type CoachPlan = 'trial' | 'plus' | 'free';

/** Mensajes de SOI seguidos sin respuesta (del más reciente hacia atrás) → cada cuántos días escribe. */
export function cadenceDays(unansweredStreak: number): number {
  if (unansweredStreak >= 14) return 7;
  if (unansweredStreak >= 6) return 3;
  if (unansweredStreak >= 3) return 2;
  return 1;
}

/** ¿Toca escribir hoy? `daysSinceLast` = días locales desde el último mensaje que SOI le escribió (null = nunca). */
export function shouldWriteToday(i: { unansweredStreak: number; daysSinceLast: number | null }): boolean {
  if (i.daysSinceLast == null) return true;
  return i.daysSinceLast >= cadenceDays(i.unansweredStreak);
}

/** Cuántos mensajes de SOI seguidos quedaron sin respuesta (lista del más reciente al más viejo). */
export function unansweredStreak(replied: boolean[]): number {
  let n = 0;
  for (const r of replied) { if (r) break; n++; }
  return n;
}

export type Occasion = 'return' | 'hard_day' | 'celebrate' | null;

/** Nota de voz en el mensaje del día: con cupo, nunca con crisis reciente y solo en una ocasión que la pide. */
export function proactiveVoice(i: { plan: CoachPlan; usedToday: number; crisisRecent: boolean; occasion: Occasion; voiceDaysAgo: number | null }): boolean {
  if (i.plan === 'free' || i.crisisRecent || i.usedToday >= VOICE_NOTES_PER_DAY) return false;
  if (i.occasion) return true;
  // Sin ocasión especial, una de vez en cuando (no más de una cada 3 días): que se sienta especial.
  return i.voiceDaysAgo == null || i.voiceDaysAgo >= 3;
}

/** Nota de voz como respuesta dentro de una plática que ya fluye (prueba y SOI+, tope diario). */
export function chatVoiceNote(i: { plan: CoachPlan; usedToday: number; userTurns: number; turnsSinceVoice: number | null; crisis: boolean }): boolean {
  if (i.plan === 'free' || i.crisis || i.usedToday >= VOICE_NOTES_PER_DAY) return false;
  if (i.userTurns < VOICE_MIN_TURNS) return false;
  return i.turnsSinceVoice == null || i.turnsSinceVoice >= VOICE_GAP_TURNS;
}

export type Closeness = 'nuevo' | 'conocido' | 'cercano';

/** Qué tanto se conocen: mensajes que la persona le ha escrito y días desde que llegó. */
export function closeness(i: { userMessages: number; daysKnown: number }): Closeness {
  if (i.userMessages >= 60 || (i.userMessages >= 30 && i.daysKnown >= 21)) return 'cercano';
  if (i.userMessages >= 10 || i.daysKnown >= 7) return 'conocido';
  return 'nuevo';
}

export const CLOSENESS_GUIDE: Record<Closeness, string> = {
  nuevo: 'Apenas se conocen: cálida y sencilla, sin suponer cosas de su vida; que se sienta bienvenida la persona.',
  conocido: 'Ya se conocen: nombra con naturalidad algo que te contó (sus palabras), como alguien que se acuerda.',
  cercano: 'Ya hay confianza: háblale como alguien que la conoce de tiempo, retoma su historia, usa sus propias expresiones y su forma de decir las cosas; un toque de juego si la persona lo tiene.',
};

export type CoachStyle = {
  length: 'corto' | 'medio' | 'largo';
  emojis: boolean;
  usted: boolean;
  laughs: boolean;
  lowercase: boolean;
  /** Sus expresiones repetidas (máx. 3), para sonar como ella. */
  expressions: string[];
};

const EMOJI = /\p{Extended_Pictographic}/u;
const LAUGH = /\b(ja){2,}|\b(je){2,}|\bjsjs|\blol\b|😂|🤣/i;
const STOP = new Set(['para', 'pero', 'como', 'esto', 'esta', 'este', 'porque', 'cuando', 'tengo', 'quiero', 'estoy', 'hacer', 'siento', 'también', 'todo', 'muy', 'algo', 'más', 'sobre', 'bien', 'gracias', 'hola']);

/** Cómo escribe la persona (de sus últimos mensajes): SOI le contesta con su mismo ritmo. */
export function learnStyle(texts: string[]): CoachStyle | null {
  const t = texts.map((x) => x.trim()).filter((x) => x.length > 0);
  if (t.length < 3) return null;
  const words = t.map((x) => x.split(/\s+/).length).sort((a, b) => a - b);
  const median = words[Math.floor(words.length / 2)]!;
  const share = (re: RegExp | ((s: string) => boolean)) => t.filter((x) => (typeof re === 'function' ? re(x) : re.test(x))).length / t.length;
  // Frases de 2 palabras que repite (sus muletillas), sin las vacías.
  const pairs = new Map<string, number>();
  for (const x of t) {
    const w = x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zñ\s]/g, ' ').split(/\s+/).filter((s) => s.length >= 2);
    const seen = new Set<string>();
    for (let i = 0; i < w.length - 1; i++) {
      if (STOP.has(w[i]!) && STOP.has(w[i + 1]!)) continue;
      const k = `${w[i]} ${w[i + 1]}`;
      if (!seen.has(k)) { seen.add(k); pairs.set(k, (pairs.get(k) ?? 0) + 1); }
    }
  }
  const expressions = [...pairs.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k]) => k);
  return {
    length: median <= 8 ? 'corto' : median <= 30 ? 'medio' : 'largo',
    emojis: share(EMOJI) >= 0.25,
    usted: share(/\busted\b/i) >= 0.2,
    laughs: share(LAUGH) >= 0.15,
    lowercase: share((s) => /^[a-zñáéíóú]/.test(s)) >= 0.7,
    expressions,
  };
}

/** El estilo de la persona, para la IA (cómo contestarle igual). */
export function stylePrompt(s: CoachStyle | null): string {
  if (!s) return 'Aún no sabes cómo escribe: mensajes cortos y naturales.';
  return [
    s.length === 'corto' ? 'Escribe mensajes muy cortos: tú también, 1–2 frases.' : s.length === 'largo' ? 'Escribe largo y con detalle: puedes extenderte un poco (3 frases).' : 'Escribe mensajes medianos: 2 frases.',
    s.emojis ? 'Usa emojis: puedes poner uno, natural.' : 'Casi no usa emojis: no los pongas.',
    s.usted ? 'Le habla de usted a SOI: háblale de usted con calidez.' : 'Se tutean.',
    s.laughs ? 'Se ríe al escribir (jaja): puedes tener un toque ligero de humor.' : '',
    s.expressions.length ? `Expresiones suyas (úsalas solo si salen natural, máx. una): ${s.expressions.map((e) => `«${e}»`).join(', ')}.` : '',
  ].filter(Boolean).join(' ');
}

/** Qué tipo de mensaje le hace responder (por tipo de gancho): los que contesta pesan más la próxima vez. */
export function responsiveBoost(history: { hook: string; replied: boolean }[]): Map<string, number> {
  const by = new Map<string, { sent: number; replied: number }>();
  for (const h of history) {
    const kind = h.hook.split(':')[0]!;
    const v = by.get(kind) ?? { sent: 0, replied: 0 };
    v.sent++; if (h.replied) v.replied++;
    by.set(kind, v);
  }
  const out = new Map<string, number>();
  for (const [k, v] of by) {
    if (v.sent < 2) continue;
    const rate = v.replied / v.sent;
    // Contesta casi siempre → +20; nunca contesta → −25 (se prueba otra cosa).
    out.set(k, rate >= 0.6 ? 20 : rate === 0 ? -25 : 0);
  }
  return out;
}

/** Frases que motivan (propias de SOI, sin citas inventadas). Se elige una que no se haya usado hace poco. */
export const MOTIVATION = [
  'Hoy no tienes que poder con todo; con dar un paso pequeño ya estás avanzando.',
  'Lo que vienes construyendo se nota, aunque a veces tú no lo veas.',
  'Cada día que eliges cuidarte un poco, te estás eligiendo a ti.',
  'No necesitas un día perfecto, solo un momento tuyo.',
  'Eres más constante de lo que crees: volver también cuenta.',
  'Lo que sientes hoy no define quién te estás volviendo.',
  'Tu ritmo es válido. Ir despacio también es ir.',
  'Hay días para avanzar y días para respirar; los dos te llevan.',
  'Me gusta recordarte que lo que haces por ti sí importa.',
  'Un pensamiento distinto hoy puede cambiar cómo se siente tu día entero.',
  'La persona que quieres ser se construye en momentos chiquitos como este.',
  'Si hoy pesa, no lo cargas a solas: aquí sigo.',
  'Confía en lo que ya empezaste; las raíces crecen antes de que se vea algo.',
  'Hoy puede ser un buen día para tratarte con la paciencia que le das a otros.',
  'No es empezar de cero: es seguir desde todo lo que ya aprendiste.',
  'Tu calma también es una forma de fuerza.',
] as const;

const GREETINGS = ['Hola', 'Holaa', 'Hey', 'Hola, hola', 'Buenas'] as const;
const HOW = ['¿cómo sigues?', '¿cómo vas?', '¿cómo te sientes hoy?', '¿cómo amaneciste?', '¿qué tal tu día?', '¿cómo va todo?'] as const;
const QUESTIONS = ['¿Cómo te ha ido?', '¿Qué tal te sientes con eso?', 'Cuéntame, ¿cómo vas?', '¿Qué traes hoy?'] as const;

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zñ0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

/** Parecido entre dos textos (palabras de 4+ letras en común / unión). */
export function overlap(a: string, b: string): number {
  const A = new Set(norm(a).split(' ').filter((w) => w.length >= 4));
  const B = new Set(norm(b).split(' ').filter((w) => w.length >= 4));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

/** El mensaje nunca es igual: válido si no se parece a los recientes, sin enlaces ni cifras y con largo de chat. */
export function validCoachMessage(text: string, recent: string[]): boolean {
  const t = text.trim();
  if (t.length < 12 || t.length > 420) return false;
  if (/https?:\/\/|www\.|\/[a-z]+\//i.test(t)) return false;
  if (/\d+\s*%|\bpuntos?\b|\bracha de \d/i.test(t)) return false;
  return recent.every((r) => norm(r) !== norm(t) && overlap(r, t) < 0.45);
}

/** Elige una opción distinta de las usadas hace poco (determinista con la semilla). */
function pick<T extends string>(list: readonly T[], seed: number, used: string[]): T {
  const fresh = list.filter((x) => !used.some((u) => norm(u).includes(norm(x))));
  const pool = fresh.length ? fresh : list;
  return pool[Math.abs(seed) % pool.length]!;
}

/**
 * Mensaje por reglas (sin IA): «Hola Mimy, ¿cómo sigues? <frase que motiva> <pregunta>», distinto cada vez.
 * `about` = algo concreto que puede nombrar (ya con sus palabras), opcional.
 */
export function ruleMessage(i: { name: string; seed: number; recent: string[]; about?: string | null; crisisRecent?: boolean }): string {
  const hi = pick(GREETINGS, i.seed, []);
  const how = pick(HOW, i.seed >> 1, i.recent);
  const greet = `${hi}${i.name ? ` ${i.name}` : ''}, ${how}`;
  if (i.crisisRecent) return `${greet} Me quedé pensando en ti. Aquí sigo, sin prisa, para cuando quieras platicar.`;
  const line = pick(MOTIVATION, i.seed >> 2, i.recent);
  const q = i.about ? `${i.about}` : pick(QUESTIONS, i.seed >> 3, i.recent);
  return `${greet} ${line} ${q}`.replace(/\s+/g, ' ').trim();
}

/** Semilla del día para una persona (cambia cada día y entre personas). */
export function daySeed(userId: string, isoDate: string): number {
  let h = 0;
  for (const c of `${userId}:${isoDate}`) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

/** Lo que la persona leerá en la notificación (el mensaje mismo, corto). */
export function pushBody(text: string, voice: boolean): string {
  const t = text.replace(/\s+/g, ' ').trim();
  const short = t.length > 150 ? `${t.slice(0, 149).trimEnd()}…` : t;
  return voice ? `🎙️ Nota de voz · ${short}` : short;
}

/** Pide crear o cambiar un Moment (con eso sí se permite la herramienta aunque la plática apenas empiece). */
export function isEditRequest(text: string): boolean {
  return /\b(cambia|cambiale|cámbiale|ajusta|ajústale|modifica|edita|quítale|quita|agrégale|agrega|hazlo más|que sea más|ponle|sin el paso)\b/i.test(text) && /(moment|«|paso|minutos|más corto|más largo|música|respiraci|escrib)/i.test(text);
}

export function asksForMoment(text: string): boolean {
  return /\b(crea|créame|diseña|diséñame|hazme|prepárame|prepara|arma|ármame|dame)\b.{0,40}\b(moment|práctica|rutina|ejercicio|meditaci)/i.test(text) || isEditRequest(text);
}
