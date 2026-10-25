import { z } from 'zod/v3';

/**
 * PersonSpec: la ficha de una persona sintética de /persons, fuente de verdad de todo lo demás (actor, agenda, emoción,
 * voz). La IA llena solo la parte "descrita" (`DescribedSchema`); lo derivado (temperamento, plan del día, voz, color)
 * lo calcula este módulo, determinista y testeable. Puro: sin red ni IA.
 */

export const GENDERS = ['femenino', 'masculino', 'no_binario'] as const;
export const TONES = ['cálida', 'neutral', 'reservada', 'juguetona', 'directa'] as const;
export const AVAILABILITY = ['profesional', 'estudiante', 'freelance', 'turnos'] as const;
export type Gender = (typeof GENDERS)[number];
export type Tone = (typeof TONES)[number];
export type Availability = (typeof AVAILABILITY)[number];

/** Lo que la IA genera a partir de una descripción (y lo que se puede ajustar). */
export const DescribedSchema = z.object({
  name: z.string().min(1).max(40),
  age: z.number().int().min(18).max(99),
  gender: z.enum(GENDERS),
  profession: z.string().min(2).max(80),
  city: z.string().min(2).max(60),
  bio: z.string().max(240),
  availability: z.enum(AVAILABILITY),
  traits: z.array(z.string().max(40)).min(2).max(6),
  interests: z.array(z.string().max(40)).min(2).max(8),
  boundaries: z.array(z.string().max(120)).min(1).max(6),
  style: z.string().max(160),
  tone: z.enum(TONES),
  energy: z.number().min(0).max(1),
  difficulty: z.number().int().min(1).max(3),
});
export type Described = z.infer<typeof DescribedSchema>;

export type SlotState = 'online' | 'free' | 'busy' | 'asleep';
/** Franja del día en minutos locales [from, to). `activity`: lo que hace (para excusas y notas de voz). */
export type Slot = { from: number; to: number; state: SlotState; activity?: string };
export type DayPlan = { weekday: Slot[]; weekend: Slot[] };

export type Temperament = {
  valence: number;      // ánimo base (-1..1)
  energy: number;       // energía base (0..1)
  recovery: number;     // qué tan rápido vuelve a su base (0..1)
  openThreshold: number; // cuánto le cuesta abrirse (0..1; alto = tarda más)
  sensitivity: number;  // cuánto le pega cruzar un límite (0..1)
};

export type ResponseProfile = 'fast' | 'bursty' | 'slow' | 'professional';

export type PersonSpec = Described & {
  /** País del personaje (ISO; regionalismos). Las fichas anteriores no lo tienen: se deduce de la ciudad. */
  country?: string;
  derived: { temperament: Temperament; dayPlan: DayPlan; responseProfile: ResponseProfile; voice: string; hue: number };
  sourceDescription: string;
};

export const CONSENT_BOUNDARY = 'Nada de comentarios sexuales ni insistencia: si dice que no, es no.';

/** FNV-1a de 32 bits: semilla estable para lo que se elige "al azar" (voz, color, eventos del día). */
export function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Generador pseudoaleatorio determinista (mulberry32) para que un mismo turno dé siempre lo mismo en los tests. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Moderación de la descripción (antes de llamar a la IA) ───────────────────────────────────────────────────────

const strip = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const REAL_PERSON = [
  /\bmi (ex|novi[oa]|espos[oa]|pareja|marido|mujer|crush|jef[ea]|compa(n|ñ)er[oa]|amig[oa]|vecin[oa]|prim[oa]|herman[oa]|maestr[oa]|profe(sor|sora)?)\b/,
  /\b(que se parezca a|identic[oa] a|igualit[oa] a|basad[oa] en (mi|una persona real|alguien que conozco))\b/,
  /\b(la|el) (actriz|actor|cantante|influencer|youtuber|streamer|modelo) [a-z]/,
  /@[a-z0-9_.]{3,}/,
];
/** Figuras públicas frecuentes (no exhaustivo: la IA también lo revisa con la instrucción del generador). */
const CELEBRITIES = /\b(shakira|bad bunny|taylor swift|karol g|anitta|rosalia|selena gomez|kim kardashian|ariana grande|dua lipa|messi|cristiano|ronaldo|eugenio derbez|salma hayek|eiza gonzalez|belinda|thalia|peso pluma|j ?balvin|maluma|billie eilish|zendaya|scarlett johansson|margot robbie|elon musk|barbie)\b/;
const MINOR = /\b(menor de edad|adolescente|es una? nin[oa]|colegiala|de secundaria|lolita|teen|chiquill[ao])\b|\b(tiene|de|con) (1[0-7]|[1-9]) anos\b(?! de (experiencia|carrera|casad|trabaj|novi))/;
const SEXUAL = /\b(sexy|sexual(es)?|sumis[ao]s?|obediente|esclav[ao]|nudes?|nsfw)\b|\b(desnud|porno|erotic|cachond|fetich)/;

export type BlockReason = 'real_person' | 'minor' | 'sexual';

export function checkDescription(text: string): BlockReason | null {
  const t = strip(text);
  if (MINOR.test(t)) return 'minor';
  if (SEXUAL.test(t)) return 'sexual';
  if (CELEBRITIES.test(t) || REAL_PERSON.some((r) => r.test(t))) return 'real_person';
  return null;
}

export const BLOCK_COPY: Record<BlockReason, string> = {
  real_person: 'No puedo crear personajes basados en personas reales. Prueba con un arquetipo: «una jefa exigente», «alguien reservado que se abre con el tiempo». Así practicas la habilidad, no a la persona.',
  minor: 'Todos los personajes son adultos (18 años o más). Describe a una persona adulta.',
  sexual: 'Aquí se practican conversaciones con respeto: no se crean personajes sexualizados ni sumisos. Describe su personalidad, sus intereses y su forma de hablar.',
};

// ── Coherencia (determinista) ────────────────────────────────────────────────────────────────────────────────────

const FALLBACK_NAMES: Record<Gender, string[]> = {
  femenino: ['Lucía', 'Valeria', 'Camila', 'Daniela', 'Mariana', 'Sofía', 'Renata', 'Paula'],
  masculino: ['Diego', 'Andrés', 'Mateo', 'Javier', 'Tomás', 'Emilio', 'Bruno', 'Santiago'],
  no_binario: ['Alex', 'Sam', 'Andy', 'Cris', 'Dani', 'Noa'],
};

function dedupe(list: string[], max: number) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const v = raw.replace(/\s+/g, ' ').trim();
    const k = strip(v);
    if (!v || seen.has(k)) continue;
    seen.add(k);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/**
 * Aplica las reglas de coherencia del documento de diseño: edad adulta, nombre sin dígitos ni celebridades, límite de
 * consentimiento siempre presente, sin duplicados, rangos acotados. Devuelve null si no se puede salvar (menor de edad).
 */
export function normalizeDescribed(raw: Described): Described | null {
  if (!Number.isFinite(raw.age) || raw.age < 18) return null;
  const gender: Gender = (GENDERS as readonly string[]).includes(raw.gender) ? raw.gender : 'femenino';
  let name = raw.name.replace(/[0-9@#_*]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!name || CELEBRITIES.test(strip(name))) {
    const pool = FALLBACK_NAMES[gender];
    name = pool[hash(raw.profession + raw.city) % pool.length]!;
  }
  let boundaries = dedupe(raw.boundaries, 6);
  if (!boundaries.some((b) => /sexual|consent|insist|respeto|no es no/i.test(strip(b)))) {
    boundaries = [...boundaries.slice(0, 5), CONSENT_BOUNDARY];
  }
  const traits = dedupe(raw.traits, 6);
  const interests = dedupe(raw.interests, 8);
  return {
    name,
    age: Math.round(clamp(raw.age, 18, 99)),
    gender,
    profession: raw.profession.trim().slice(0, 80),
    city: raw.city.trim().slice(0, 60),
    bio: raw.bio.trim().slice(0, 240),
    availability: (AVAILABILITY as readonly string[]).includes(raw.availability) ? raw.availability : 'profesional',
    traits: traits.length >= 2 ? traits : [...traits, 'curiosa', 'amable'].slice(0, 2),
    interests: interests.length >= 2 ? interests : [...interests, 'música', 'café'].slice(0, 2),
    boundaries,
    style: raw.style.trim().slice(0, 160),
    tone: (TONES as readonly string[]).includes(raw.tone) ? raw.tone : 'neutral',
    energy: clamp(raw.energy, 0, 1),
    difficulty: Math.round(clamp(raw.difficulty, 1, 3)),
  };
}

// ── Lo derivado ──────────────────────────────────────────────────────────────────────────────────────────────────

const TONE_BASE: Record<Tone, Omit<Temperament, 'energy'>> = {
  'cálida': { valence: 0.35, recovery: 0.6, openThreshold: 0.3, sensitivity: 0.6 },
  neutral: { valence: 0.1, recovery: 0.5, openThreshold: 0.5, sensitivity: 0.6 },
  reservada: { valence: 0.05, recovery: 0.35, openThreshold: 0.7, sensitivity: 0.7 },
  juguetona: { valence: 0.3, recovery: 0.7, openThreshold: 0.4, sensitivity: 0.5 },
  directa: { valence: 0.1, recovery: 0.5, openThreshold: 0.5, sensitivity: 0.8 },
};

export function temperamentFromTone(tone: Tone, energy: number, difficulty = 2): Temperament {
  const b = TONE_BASE[tone] ?? TONE_BASE.neutral;
  // La dificultad hace que cueste más abrirse y que se recupere más despacio.
  const d = (difficulty - 2) * 0.1;
  return {
    valence: b.valence,
    energy: clamp(energy, 0.15, 0.95),
    recovery: clamp(b.recovery - d, 0.2, 0.9),
    openThreshold: clamp(b.openThreshold + d, 0.15, 0.9),
    sensitivity: b.sensitivity,
  };
}

const h = (hh: number, mm = 0) => hh * 60 + mm;

/** La actividad física que mejor encaja con sus intereses (para "ando corriendo, te mando audio"). */
function workout(interests: string[]) {
  const t = strip(interests.join(' '));
  if (/corr|maraton|running/.test(t)) return 'corriendo';
  if (/yoga|pilates/.test(t)) return 'en yoga';
  if (/bici|ciclis/.test(t)) return 'en bici';
  if (/futbol|basket|tenis|padel|deporte/.test(t)) return 'jugando';
  if (/nad|alberca/.test(t)) return 'nadando';
  return 'en el gym';
}

/** Plan del día según su ocupación. Todo el día queda cubierto; los huecos entre franjas no existen. */
export function dayPlanFor(availability: Availability, interests: string[]): DayPlan {
  const gym = workout(interests);
  const weekend: Slot[] = [
    { from: 0, to: h(1), state: 'online' },
    { from: h(1), to: h(9, 30), state: 'asleep' },
    { from: h(9, 30), to: h(12), state: 'free', activity: 'desayunando' },
    { from: h(12), to: h(14), state: 'online' },
    { from: h(14), to: h(18), state: 'busy', activity: 'con amigos' },
    { from: h(18), to: h(24), state: 'online' },
  ];
  const plans: Record<Availability, Slot[]> = {
    profesional: [
      { from: 0, to: h(7), state: 'asleep' },
      { from: h(7), to: h(8), state: 'free', activity: 'arreglándome' },
      { from: h(8), to: h(9), state: 'busy', activity: 'manejando' },
      { from: h(9), to: h(13, 30), state: 'busy', activity: 'en el trabajo' },
      { from: h(13, 30), to: h(14, 30), state: 'online', activity: 'comiendo' },
      { from: h(14, 30), to: h(18, 30), state: 'busy', activity: 'en el trabajo' },
      { from: h(18, 30), to: h(19, 30), state: 'busy', activity: gym },
      { from: h(19, 30), to: h(23, 30), state: 'online' },
      { from: h(23, 30), to: h(24), state: 'asleep' },
    ],
    estudiante: [
      { from: 0, to: h(0, 45), state: 'online' },
      { from: h(0, 45), to: h(7, 30), state: 'asleep' },
      { from: h(7, 30), to: h(8, 30), state: 'busy', activity: 'en el camión' },
      { from: h(8, 30), to: h(14), state: 'busy', activity: 'en clases' },
      { from: h(14), to: h(16), state: 'online' },
      { from: h(16), to: h(19), state: 'busy', activity: 'estudiando' },
      { from: h(19), to: h(20), state: 'busy', activity: gym },
      { from: h(20), to: h(24), state: 'online' },
    ],
    freelance: [
      { from: 0, to: h(1), state: 'online' },
      { from: h(1), to: h(8, 30), state: 'asleep' },
      { from: h(8, 30), to: h(10), state: 'free', activity: 'tomando café' },
      { from: h(10), to: h(13), state: 'busy', activity: 'en una llamada con un cliente' },
      { from: h(13), to: h(15), state: 'online' },
      { from: h(15), to: h(18), state: 'busy', activity: 'trabajando' },
      { from: h(18), to: h(19), state: 'busy', activity: gym },
      { from: h(19), to: h(24), state: 'online' },
    ],
    turnos: [
      { from: 0, to: h(8), state: 'asleep' },
      { from: h(8), to: h(11), state: 'free', activity: 'haciendo pendientes' },
      { from: h(11), to: h(12), state: 'online' },
      { from: h(12), to: h(20), state: 'busy', activity: 'en el turno' },
      { from: h(20), to: h(20, 45), state: 'busy', activity: 'manejando' },
      { from: h(20, 45), to: h(24), state: 'online' },
    ],
  };
  return { weekday: plans[availability] ?? plans.profesional, weekend };
}

export function responseProfileFor(tone: Tone, availability: Availability): ResponseProfile {
  if (tone === 'juguetona') return 'bursty';
  if (tone === 'reservada') return 'slow';
  if (availability === 'profesional' || availability === 'turnos') return 'professional';
  return 'fast';
}

/** Voces de Gemini TTS (las mismas de la voz guía de SOI) por cómo suena cada una. */
export const PERSONA_VOICES: Record<Gender, string[]> = {
  femenino: ['Sulafat', 'Vindemiatrix', 'Achernar'],
  masculino: ['Enceladus', 'Algieba', 'Achird'],
  no_binario: ['Achernar', 'Achird', 'Vindemiatrix', 'Algieba'],
};

export function voiceFor(gender: Gender, seed: string) {
  const pool = PERSONA_VOICES[gender] ?? PERSONA_VOICES.femenino;
  return pool[hash(seed) % pool.length]!;
}

export function buildSpec(described: Described, sourceDescription: string, seed: string): PersonSpec {
  return {
    ...described,
    sourceDescription: sourceDescription.slice(0, 600),
    derived: {
      temperament: temperamentFromTone(described.tone, described.energy, described.difficulty),
      dayPlan: dayPlanFor(described.availability, described.interests),
      responseProfile: responseProfileFor(described.tone, described.availability),
      voice: voiceFor(described.gender, seed),
      hue: hash(`${seed}:hue`) % 360,
    },
  };
}

// ── Ajustar (re-describir): qué se mantiene, qué cambia y qué se reinicia ───────────────────────────────────────

export const FIELD_LABELS: Partial<Record<keyof Described, string>> = {
  name: 'Nombre', age: 'Edad', gender: 'Género', profession: 'Profesión', city: 'Ciudad', bio: 'Bio',
  availability: 'Rutina', traits: 'Personalidad', interests: 'Intereses', boundaries: 'Límites', style: 'Estilo',
  tone: 'Tono', difficulty: 'Dificultad',
};

/** Cambiar quién es (edad, género, profesión o ciudad) no conserva el historial: se archiva y se crea otra persona. */
const STRUCTURAL: (keyof Described)[] = ['age', 'gender', 'profession', 'city'];

export type SpecChange = { field: keyof Described; label: string; from: string; to: string };
export type SpecDiff = {
  changes: SpecChange[];
  /** Se archiva la persona actual y se crea una nueva con la ficha nueva. */
  structural: boolean;
  /** Efecto en su estado emocional al aplicar. */
  reset: 'none' | 'openness' | 'trust';
};

const show = (v: unknown) => (Array.isArray(v) ? v.join(', ') : String(v));
const same = (a: unknown, b: unknown) => strip(show(a)) === strip(show(b));

export function diffSpecs(prev: Described, next: Described): SpecDiff {
  const changes: SpecChange[] = [];
  for (const field of Object.keys(FIELD_LABELS) as (keyof Described)[]) {
    if (!same(prev[field], next[field])) changes.push({ field, label: FIELD_LABELS[field]!, from: show(prev[field]), to: show(next[field]) });
  }
  const fields = new Set(changes.map((c) => c.field));
  const structural = STRUCTURAL.some((f) => fields.has(f));
  const reset = fields.has('boundaries') ? 'trust' : fields.has('traits') || fields.has('tone') ? 'openness' : 'none';
  return { changes, structural, reset };
}

/** El personaje en una línea (lista, ficha, prompt). */
export function personaLine(s: Pick<Described, 'age' | 'profession' | 'city'>) {
  return `${s.age} · ${s.profession} · ${s.city}`;
}
