import type { OpenerReply } from '@/lib/opener';

/**
 * Ganchos del saludo: lo que SOI sabe y vale la pena recordar HOY. Se elige uno por relevancia, sin repetir los
 * últimos, y la IA lo escribe con su voz. Cada gancho tiene además una plantilla propia (respaldo sin IA: aun así varía).
 */
export type HookKind =
  | 'thread' | 'declined' | 'return' | 'plan' | 'written' | 'reflection' | 'enemy' | 'insight'
  | 'helped' | 'identity' | 'goal' | 'momentum' | 'checkin';

export type Hook = {
  kind: HookKind;
  /** Identifica el gancho concreto (tipo + referencia) para no repetirlo. */
  key: string;
  weight: number;
  /** Depende de la hora ("las tardes…"): solo sirve en esa parte del día. */
  timeBound: boolean;
  /** Datos para la IA y la plantilla (sus palabras van entre comillas). */
  facts: Record<string, string>;
};

const cap = (t: string | undefined) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : '');

/** "domingo" → "el domingo" (los días de la semana llevan artículo); "ayer", "hoy", "hace un rato" quedan igual. */
export function whenPhrase(label: string | null | undefined): string {
  if (!label) return 'hace poco';
  return /^(hoy|ayer|hace |la última|el |la )/i.test(label) ? label : `el ${label}`;
}

/** El más relevante que no se haya usado en los últimos 3 saludos (las mismas claves no se repiten). */
export function pickHook(hooks: Hook[], recentKeys: string[]): Hook {
  const recent = new Set(recentKeys.slice(0, 3));
  const lastKind = recentKeys[0]?.split(':')[0];
  const sorted = [...hooks].sort((a, b) => b.weight - a.weight);
  return sorted.find((h) => !recent.has(h.key) && (h.kind !== lastKind || h.kind === 'thread'))
    ?? sorted.find((h) => !recent.has(h.key))
    ?? { kind: 'checkin', key: 'checkin', weight: 0, timeBound: false, facts: {} };
}

/** Respaldo sin IA: una frase por gancho, con sus palabras. Siempre UNA pregunta. */
export function templateFor(h: Hook): string {
  const f = h.facts;
  switch (h.kind) {
    case 'thread': return f.quote ? `${cap(f.when)} me contaste: «${f.quote}». ¿Cómo siguió?` : `${cap(f.when)} hablamos de algo importante para ti. ¿Cómo sigues hoy?`;
    case 'declined': return `${cap(f.when)} preferiste dejar «${f.title}» para otro momento, y está bien. ¿Qué te pide el cuerpo hoy?`;
    case 'return': return 'Qué bueno verte de nuevo. Sin prisa: ¿cómo has estado estos días?';
    case 'plan': return `En tu día sigue «${f.title}». ¿Cómo llegas a ese momento?`;
    case 'written': return `${cap(f.when)}, en «${f.title}», ${f.verb ?? 'escribiste'}: «${f.quote}». ¿Cómo te fue con eso?`;
    case 'reflection': return `${cap(f.when)} escribiste: «${f.quote}». ¿Sigue siendo así?`;
    case 'enemy': return `Sé que ${f.part} a veces aparece ${f.enemy}. ¿Cómo viene hoy?`;
    case 'insight': return `Me quedé pensando en algo que me dijiste: «${f.quote}». ¿Cómo lo ves hoy?`;
    case 'helped': return `${cap(f.when)} «${f.title}» te hizo bien a esta hora. ¿Cómo te sientes ahora?`;
    case 'identity': return `Te estás convirtiendo en «${f.identity}». ¿Qué pequeño paso de esa persona te gustaría dar hoy?`;
    case 'goal': return `Hace poco me hablaste de «${f.goal}». ¿Cómo va eso?`;
    case 'momentum': return 'Se nota tu constancia estos días. ¿Qué te está funcionando?';
    default: return '¿Cómo llegas hoy: con energía, neutral o con algo de carga?';
  }
}

/** Respuestas de un toque según el gancho (máx. 3). */
export function repliesFor(h: Hook): OpenerReply[] {
  const r = (label: string, text: string) => ({ label, text });
  switch (h.kind) {
    case 'thread': return [r('Mejor', 'Mejor, gracias por preguntar.'), r('Sigue igual', 'Sigue igual.'), r('Hoy es otra cosa', 'Hoy es otra cosa.')];
    case 'goal': case 'identity': return [r('Avancé', 'Avancé un poco.'), r('Me trabé', 'Me trabé, la verdad.'), r('Hoy otra cosa', 'Hoy traigo otra cosa.')];
    case 'enemy': return [r('Hoy no', 'Hoy no apareció.'), r('Sí, un poco', 'Sí, un poco.'), r('Bastante', 'Bastante, la verdad.')];
    case 'written': case 'reflection': case 'insight': return [r('Sigue siendo así', 'Sigue siendo así.'), r('Ya cambió', 'Ya cambió un poco.'), r('Hoy otra cosa', 'Hoy traigo otra cosa.')];
    case 'return': return [r('Bien', 'He estado bien.'), r('Complicado', 'Han sido días complicados.'), r('Con ganas de volver', 'Con ganas de retomar.')];
    default: return [r('Con energía', 'Hoy llego con energía.'), r('Neutral', 'Hoy llego neutral.'), r('Con algo de carga', 'Hoy llego con algo de carga.')];
  }
}

/** Valida lo que escribió la IA: breve, una pregunta, sin cifras ni saludo propio, distinto a los últimos. */
export function validOpener(text: string, recentTexts: string[]): boolean {
  const t = text.trim();
  if (t.length < 20 || t.length > 280) return false;
  if ((t.match(/\?/g) ?? []).length !== 1) return false;
  if (/\d/.test(t)) return false;
  if (/^(hola|buen[oa]s? (d[ií]as|tardes|noches))/i.test(t)) return false;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-záéíóúñ ]/g, '').trim();
  return !recentTexts.some((r) => norm(r) === norm(t));
}
