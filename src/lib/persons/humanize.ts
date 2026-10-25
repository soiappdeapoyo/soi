import { hash, seeded, type PersonSpec } from './spec';

/**
 * Que el personaje escriba como una persona en el teléfono, no como un asistente: a veces sin mayúscula al inicio,
 * sin ¿ ¡, sin punto final, acentos que se le pasan, abreviaciones (q, xq, tmb) y de vez en cuando un dedazo que a
 * veces corrige en el mensaje siguiente («*mañana»). Cada personaje tiene su forma (más joven o relajado → más suelto;
 * si su estilo dice formal o cuidadoso → casi nada). Puro y determinista (recibe `rand`).
 */

export type Quirks = {
  /** Probabilidad de empezar una burbuja en minúscula. */
  lowercase: number;
  /** Probabilidad, por palabra con acento, de que se le pase. */
  accents: number;
  /** Probabilidad de no usar ¿ ni ¡. */
  marks: number;
  /** Probabilidad de no poner punto final. */
  period: number;
  /** Probabilidad, por ocurrencia, de abreviar (que → q, porque → xq…). */
  abbrev: number;
  /** Probabilidad, por burbuja, de un dedazo. */
  typos: number;
};

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Qué tan suelto escribe: edad, su estilo descrito y un toque propio (estable por personaje). */
export function quirksFor(spec: Pick<PersonSpec, 'age' | 'style' | 'traits' | 'name'>, seed = spec.name): Quirks {
  const style = `${spec.style} ${spec.traits.join(' ')}`.toLowerCase();
  let c = spec.age < 26 ? 0.75 : spec.age < 36 ? 0.6 : spec.age < 50 ? 0.45 : 0.3;
  if (/formal|cuidad|ortograf|correct|profesional|educad|serio/.test(style)) c -= 0.3;
  if (/minúscul|minuscul|relajad|informal|emoji|sarc|desparpaj|caótic|caotic|rápid|rapid|despistad/.test(style)) c += 0.15;
  c = clamp(c + (seeded(hash(`quirks:${seed}`))() - 0.5) * 0.2);
  return {
    lowercase: clamp(0.25 + c * 0.7),
    accents: clamp(c * 0.55),
    marks: clamp(0.35 + c * 0.6),
    period: 0.92,
    abbrev: clamp(c * 0.4),
    typos: clamp(c * 0.16),
  };
}

/** Palabra completa sin importar acentos ni mayúsculas (`\b` de JS no entiende «también»). */
const word = (w: string) => new RegExp(`(?<!\\p{L})(?:${w})(?!\\p{L})`, 'giu');
const ABBREV: [RegExp, string[]][] = [
  [word('porque'), ['xq', 'pq', 'porq']],
  [word('que'), ['q', 'k']],
  [word('también|tambien'), ['tmb', 'tambn']],
  [word('por favor'), ['porfa', 'plis']],
  [word('para'), ['pa', 'pra']],
  [word('está bien|esta bien'), ['ta bien', 'sta bien']],
  [word('nada'), ['nda']],
  [word('verdad'), ['vdd']],
];
const ACCENT: Record<string, string> = { á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' };
const WORD = /[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+/g;
/** Enlaces, menciones y números se dejan como están. */
const PROTECTED = /https?:\/\/\S+|@\S+|\d[\d:.,]*/g;

function mapWords(text: string, fn: (w: string) => string) {
  const parts: string[] = [];
  let last = 0;
  for (const m of text.matchAll(PROTECTED)) {
    parts.push(text.slice(last, m.index).replace(WORD, fn), m[0]);
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last).replace(WORD, fn));
  return parts.join('');
}

/** Un dedazo creíble: dos letras de en medio que se cruzan, o una que falta. Nunca en la primera letra. */
export function typo(word: string, rand: () => number) {
  if (word.length < 5) return word;
  const i = 1 + Math.floor(rand() * (word.length - 2));
  if (rand() < 0.6 && i < word.length - 1 && word[i] !== word[i + 1]) return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2);
  return word.slice(0, i) + word.slice(i + 1);
}

/**
 * Una burbuja escrita "a mano". `strict` (al marcar un límite): solo minúsculas y signos, nada que la vuelva confusa.
 * Devuelve el texto y, si hubo un dedazo que decide corregir, la corrección («*palabra»).
 */
export function humanize(text: string, q: Quirks, rand: () => number, strict = false): { text: string; correction: string | null } {
  let t = text.trim();
  if (!t) return { text: t, correction: null };
  if (rand() < q.marks) t = t.replace(/[¿¡]/g, '');
  if (rand() < q.period) t = t.replace(/(?<![.])\.$/, '');
  if (!strict) {
    for (const [re, options] of ABBREV) {
      t = t.replace(re, (m) => (rand() < q.abbrev ? options[Math.floor(rand() * options.length)]! : m));
    }
    t = mapWords(t, (w) => (/[áéíóú]/.test(w) && rand() < q.accents ? w.replace(/[áéíóú]/g, (c) => ACCENT[c]!) : w));
  }
  if (rand() < q.lowercase) t = t.replace(/^([¿¡"«(]*)(\p{Lu})/u, (_, pre: string, c: string) => pre + c.toLowerCase());

  let correction: string | null = null;
  if (!strict && rand() < q.typos) {
    const words = [...t.matchAll(WORD)].filter((m) => m[0].length >= 5);
    const pick = words[Math.floor(rand() * words.length)];
    if (pick) {
      const wrong = typo(pick[0], rand);
      if (wrong !== pick[0]) {
        t = t.slice(0, pick.index) + wrong + t.slice(pick.index! + pick[0].length);
        if (rand() < 0.4) correction = `*${pick[0].toLowerCase()}`;
      }
    }
  }
  return { text: t, correction };
}

type Item = { content: string; kind: 'text' | 'voice'; deliverAt: Date; meta?: Record<string, unknown> };

/**
 * Aplica la escritura a mano a lo que se va a entregar (las notas de voz no: se oyen, no se leen). Una corrección
 * llega 2–5 s después de su burbuja, como en un chat real.
 */
export function humanizeItems<T extends Item>(items: T[], q: Quirks, rand: () => number, strict = false): T[] {
  const out: T[] = [];
  for (const it of items) {
    if (it.kind !== 'text') { out.push(it); continue; }
    const h = humanize(it.content, q, rand, strict);
    out.push({ ...it, content: h.text });
    if (h.correction) {
      out.push({ ...it, content: h.correction, deliverAt: new Date(it.deliverAt.getTime() + (2 + rand() * 3) * 1000), meta: { ...it.meta, correction: true } });
    }
  }
  return out.sort((a, b) => a.deliverAt.getTime() - b.deliverAt.getTime());
}
