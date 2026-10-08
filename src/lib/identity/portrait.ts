import type { Capacity } from '@/config/capacities';

/**
 * "Tu historia" como retrato, no como bitácora: en vez de narrar eventos por fecha (frío, sintético), muestra en
 * quién se está convirtiendo la persona, en presente y con sus palabras, para que pueda visualizarse.
 * Puro (sin IA ni base de datos): solo traduce la evidencia real a rasgos de identidad.
 */

/** Cómo se ve cada capacidad cuando ya es parte de alguien ("Eres alguien que…"). */
export const CAPACITY_TRAIT: Record<Capacity, string> = {
  Claridad: 'sabe lo que quiere y no se pierde en el ruido',
  Disciplina: 'cumple lo que se propone, aunque no tenga ganas',
  Constancia: 'vuelve, una y otra vez, aunque se haya alejado',
  Enfoque: 'pone su energía en lo que importa',
  Calma: 'sabe regresar a la calma cuando el día aprieta',
  Confianza: 'confía en lo que es capaz de hacer',
  Liderazgo: 'toma la iniciativa y marca el camino',
  Comunicación: 'dice lo que siente con claridad y cuidado',
  Creatividad: 'encuentra caminos nuevos donde otros ven muros',
  Gratitud: 'nota lo bueno que ya tiene',
  Salud: 'cuida su cuerpo como su casa',
  'Mentalidad de riqueza': 'piensa en abundancia y en el valor que puede crear',
  Aprendizaje: 'aprende de todo, también de lo que no salió',
  Coraje: 'hace lo que le da miedo',
  Paciencia: 'sabe esperar sin soltar lo que quiere',
  Persistencia: 'no se rinde cuando el camino se pone difícil',
};

export type PortraitInput = {
  identities: { name: string; evidenceCount: number }[];
  capacities: { name: Capacity; xp: number }[];
  evidence: { kind: 'moment' | 'reflexion' | 'logro' | 'regreso'; title: string; note: string | null }[];
  vision: { aim: string | null; target: string | null; goals: string[] };
};

export type Portrait = {
  /** Identidades que ya se están volviendo reales, en orden de evidencia. */
  becoming: string[];
  /** "Eres alguien que…": rasgos demostrados con evidencia. */
  traits: string[];
  /** Sus propias palabras (lo que escribió en sus Moments), sin fecha. */
  words: string[];
  /** Hacia dónde va: su propósito o sus metas, con sus palabras. */
  future: string | null;
};

const clip = (s: string, max: number) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : t;
};

export function buildPortrait(input: PortraitInput): Portrait {
  const becoming = input.identities
    .filter((i) => i.name.trim())
    .sort((a, b) => b.evidenceCount - a.evidenceCount)
    .map((i) => i.name.trim())
    .slice(0, 3);

  const traits: string[] = [];
  const add = (t: string) => { if (!traits.includes(t) && traits.length < 4) traits.push(t); };
  const count = (k: PortraitInput['evidence'][number]['kind']) => input.evidence.filter((e) => e.kind === k).length;
  // Lo que más la define, primero: lo que repite y lo que le cuesta (volver, escribirse, lograr).
  if (count('regreso') >= 1) add(CAPACITY_TRAIT.Constancia);
  for (const c of input.capacities.filter((c) => c.xp >= 2).slice(0, 3)) add(CAPACITY_TRAIT[c.name]);
  if (count('reflexion') >= 2) add('se detiene a escucharse y pone en palabras lo que siente');
  if (count('logro') >= 1) add('convierte sus intenciones en resultados que puede nombrar');
  if (!traits.length && input.evidence.length) add('decidió empezar, y eso ya cuenta');

  const seen = new Set<string>();
  const words = input.evidence
    .filter((e) => (e.kind === 'reflexion' || e.kind === 'logro') && e.note && e.note.trim().length >= 12)
    .map((e) => clip(e.note!, 160))
    .filter((w) => { const k = w.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, 3);

  // Su propósito o sus metas, con sus palabras (no se reescriben: se citan).
  const aim = input.vision.aim?.trim();
  const goals = input.vision.goals.map((g) => g.trim()).filter(Boolean).slice(0, 2);
  const future = aim
    ? `${clip(aim, 180)}${input.vision.target ? ` · ${clip(input.vision.target, 60)}` : ''}`
    : goals.length ? goals.map((g) => clip(g, 90)).join(' · ') : null;

  return { becoming, traits, words, future };
}
