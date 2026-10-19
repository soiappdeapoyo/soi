import { lifeArea } from '@/config/life-areas';
import { valueById, type Value } from '@/config/values';
import type { AreaView } from '@/lib/life-map';

/**
 * Conflictos internos (puro y testeado): lo que la persona dice que le importa contra lo que de verdad hace.
 * No es un juicio: es la pregunta que un buen coach haría. Como mucho dos a la vez, el más fuerte primero.
 *  - neglected: un valor cuyas áreas no tuvieron ninguna evidencia en 30 días, aunque la persona sí estuvo activa.
 *  - low: un valor cuya área está en 4/10 o menos y no es área de enfoque.
 *  - focus: ninguna de sus áreas de enfoque toca alguno de sus valores.
 */
export type ValueConflict = {
  kind: 'neglected' | 'low' | 'focus';
  value: Value | null;
  /** Una frase, en segunda persona y sin culpa. */
  text: string;
  /** El agente con quien trabajarlo (el del área). */
  agent: string;
  weight: number;
};

/** Evidencia total del mes por debajo de esto = la persona casi no estuvo; no es conflicto, es pausa. */
const ACTIVE_MIN = 3;

export function readValues(raw: unknown): Value[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((v) => valueById(String(v))).filter((v): v is Value => Boolean(v)).slice(0, 5);
}

export function detectConflicts(values: Value[], areas: AreaView[]): ValueConflict[] {
  if (!values.length || !areas.length) return [];
  const byId = new Map(areas.map((a) => [a.area.id as string, a]));
  const active = areas.reduce((s, a) => s + a.evidence30, 0) >= ACTIVE_MIN;
  const out: ValueConflict[] = [];

  for (const v of values) {
    const mine = v.areas.map((id) => byId.get(id)).filter((a): a is AreaView => Boolean(a));
    if (!mine.length) continue;
    const main = mine[0]!;
    const low = mine.filter((a) => a.current !== null && a.current <= 4 && !a.focus).sort((a, b) => (a.current ?? 0) - (b.current ?? 0))[0];
    if (low) {
      out.push({ kind: 'low', value: v, agent: low.area.agent, weight: 80 + (5 - (low.current ?? 5)),
        text: `Elegiste «${v.label}» como valor y ${low.area.label.toLowerCase()} está en ${low.current}/10, fuera de tus áreas de enfoque. ¿Le darías un lugar esta semana?` });
      continue;
    }
    if (active && mine.every((a) => a.evidence30 === 0)) {
      out.push({ kind: 'neglected', value: v, agent: main.area.agent, weight: 70,
        text: `Dices que te importa «${v.label}», y este mes tu tiempo fue a otras áreas. ¿Qué pequeño gesto lo traería de vuelta?` });
    }
  }

  const focus = areas.filter((a) => a.focus);
  if (focus.length && !focus.some((a) => values.some((v) => (v.areas as readonly string[]).includes(a.area.id)))) {
    const first = values[0]!;
    out.push({ kind: 'focus', value: null, agent: lifeArea(first.areas[0])?.agent ?? 'anti_sycophant', weight: 50,
      text: `Tus áreas de enfoque no tocan ninguno de tus valores (${values.map((v) => v.label).join(', ')}). ¿Es ahí donde quieres poner tus 90 días?` });
  }
  return out.sort((a, b) => b.weight - a.weight).slice(0, 2);
}
