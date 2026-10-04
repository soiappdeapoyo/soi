/**
 * Ejercicios: free-exercise-db (https://github.com/yuhonas/free-exercise-db), dominio público (Unlicense).
 * ~870 ejercicios con 2 fotos por movimiento (posición inicial y final): alternarlas da la animación.
 * Calistenia = sin equipo ("body only"); gimnasio = con equipo; estiramiento = categoría stretching.
 */
const DATA_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

type Raw = {
  id: string; name: string; level: string; equipment: string | null; category: string;
  primaryMuscles: string[]; secondaryMuscles: string[]; instructions: string[]; images: string[];
};

export type ExerciseKind = 'calistenia' | 'gimnasio' | 'estiramiento';
export type Exercise = {
  id: string; name: string; kind: ExerciseKind; level: string; equipment: string;
  muscles: string[]; secondary: string[]; instructions: string[]; frames: string[];
};

export const MUSCLE_ES: Record<string, string> = {
  abdominals: 'Abdomen', hamstrings: 'Isquiotibiales', adductors: 'Aductores', quadriceps: 'Cuádriceps', biceps: 'Bíceps',
  shoulders: 'Hombros', chest: 'Pecho', 'middle back': 'Espalda media', calves: 'Pantorrillas', glutes: 'Glúteos',
  'lower back': 'Espalda baja', lats: 'Dorsales', triceps: 'Tríceps', traps: 'Trapecios', forearms: 'Antebrazos',
  neck: 'Cuello', abductors: 'Abductores',
};
export const LEVEL_ES: Record<string, string> = { beginner: 'Principiante', intermediate: 'Intermedio', expert: 'Avanzado' };
export const EQUIPMENT_ES: Record<string, string> = {
  'body only': 'Sin equipo', machine: 'Máquina', other: 'Otro', 'foam roll': 'Rodillo', kettlebells: 'Pesa rusa', dumbbell: 'Mancuernas',
  cable: 'Polea', barbell: 'Barra', bands: 'Bandas', 'medicine ball': 'Balón medicinal', 'exercise ball': 'Pelota de ejercicio', 'e-z curl bar': 'Barra Z',
};
export const KIND_LABEL: Record<ExerciseKind, string> = { calistenia: 'Calistenia', gimnasio: 'Gimnasio', estiramiento: 'Estiramiento' };

export function kindOf(r: Pick<Raw, 'equipment' | 'category'>): ExerciseKind {
  if (r.category === 'stretching') return 'estiramiento';
  return !r.equipment || r.equipment === 'body only' ? 'calistenia' : 'gimnasio';
}

function toExercise(r: Raw): Exercise {
  return {
    id: r.id, name: r.name, kind: kindOf(r), level: LEVEL_ES[r.level] ?? r.level,
    equipment: EQUIPMENT_ES[r.equipment ?? 'body only'] ?? 'Sin equipo',
    muscles: r.primaryMuscles.map((m) => MUSCLE_ES[m] ?? m), secondary: r.secondaryMuscles.map((m) => MUSCLE_ES[m] ?? m),
    instructions: r.instructions, frames: r.images.slice(0, 2).map((p) => IMG_BASE + p),
  };
}

export async function allExercises(): Promise<Exercise[]> {
  const res = await fetch(DATA_URL, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!res?.ok) return [];
  return ((await res.json()) as Raw[]).filter((r) => r.images?.length).map(toExercise);
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Filtra por tipo y texto (nombre en inglés, músculos y equipo en español). Calistenia primero por defecto. */
export function filterExercises(list: Exercise[], opts: { kind?: ExerciseKind | null; q?: string | null; limit?: number }) {
  const q = norm(opts.q ?? '').trim();
  return list
    .filter((e) => !opts.kind || e.kind === opts.kind)
    .filter((e) => !q || norm(`${e.name} ${e.muscles.join(' ')} ${e.secondary.join(' ')} ${e.equipment}`).includes(q))
    .sort((a, b) => (a.level === b.level ? a.name.localeCompare(b.name) : a.level === 'Principiante' ? -1 : b.level === 'Principiante' ? 1 : 0))
    .slice(0, opts.limit ?? 30);
}

export async function getExercise(id: string) {
  if (!/^[A-Za-z0-9_-]{2,120}$/.test(id)) return null;
  return (await allExercises()).find((e) => e.id === id) ?? null;
}

/** Versión para listas (sin instrucciones: van en el detalle). */
export function listItem(e: Exercise): Omit<Exercise, 'instructions'> {
  const { instructions, ...rest } = e;
  void instructions;
  return rest;
}
