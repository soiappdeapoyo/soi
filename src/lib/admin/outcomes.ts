/**
 * ¿SOI de verdad ayuda? (puro y testeado). Tres preguntas para el panel, sin contenido de nadie:
 *  - Activación: de quienes se registraron, cuántos vivieron su primer Moment en sus primeros 7 días.
 *  - Retención: cuántos volvieron al día siguiente (día 1), en su segunda semana (días 7–13) y en su segundo mes (días 30–59).
 *    Volver = escribir en el chat o terminar un Moment. Solo cuentan las cohortes con edad suficiente.
 *  - Transformación: de quienes dibujaron su mapa hace 30+ días y se volvieron a medir, cuánto cambiaron sus áreas
 *    de enfoque y cuántos mejoraron al menos un punto.
 */

export type OutcomeUser = { id: string; created_at: string };
export type Activity = { user_id: string; at: string; kind: 'message' | 'moment' };
export type MapRow = { user_id: string; focus: string[]; assessments: { kind: string; scores: Record<string, number>; created_at: string }[] };

export type Rate = { num: number; den: number; pct: number | null };
const rate = (num: number, den: number): Rate => ({ num, den, pct: den ? Math.round((num / den) * 100) : null });

const DAY = 86_400_000;
const dayIndex = (signup: string, at: string) => Math.floor((Date.parse(at) - Date.parse(signup)) / DAY);

export type Outcomes = {
  activation: Rate;
  wroteFirst: Rate;
  d1: Rate;
  d7: Rate;
  d30: Rate;
  transformation: { measured: number; improved: Rate; avgChange: number | null };
};

export function computeOutcomes(users: OutcomeUser[], activity: Activity[], maps: MapRow[], now = Date.now()): Outcomes {
  const byUser = new Map<string, Activity[]>();
  for (const a of activity) byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), a]);
  const age = (u: OutcomeUser) => (now - Date.parse(u.created_at)) / DAY;

  const old7 = users.filter((u) => age(u) >= 7);
  const activated = old7.filter((u) => (byUser.get(u.id) ?? []).some((a) => a.kind === 'moment' && dayIndex(u.created_at, a.at) <= 6)).length;
  const wrote = old7.filter((u) => (byUser.get(u.id) ?? []).some((a) => a.kind === 'message' && dayIndex(u.created_at, a.at) <= 6)).length;

  const back = (minAge: number, from: number, to: number) => {
    const cohort = users.filter((u) => age(u) >= minAge);
    const n = cohort.filter((u) => (byUser.get(u.id) ?? []).some((a) => { const d = dayIndex(u.created_at, a.at); return d >= from && d <= to; })).length;
    return rate(n, cohort.length);
  };

  // Transformación: primera medición completa vs. la última (al menos 30 días después), en sus áreas de enfoque.
  const changes: number[] = [];
  let improved = 0;
  for (const m of maps) {
    const full = m.assessments.filter((a) => a.kind !== 'semanal').sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
    const first = full[0];
    const last = [...m.assessments].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
    if (!first || !last || Date.parse(last.created_at) - Date.parse(first.created_at) < 30 * DAY || !m.focus.length) continue;
    const deltas = m.focus.map((f) => (typeof first.scores[f] === 'number' && typeof last.scores[f] === 'number' ? last.scores[f]! - first.scores[f]! : null)).filter((d): d is number => d !== null);
    if (!deltas.length) continue;
    changes.push(deltas.reduce((s, d) => s + d, 0) / deltas.length);
    if (deltas.some((d) => d >= 1)) improved++;
  }

  return {
    activation: rate(activated, old7.length),
    wroteFirst: rate(wrote, old7.length),
    d1: back(2, 1, 1),
    d7: back(14, 7, 13),
    d30: back(60, 30, 59),
    transformation: {
      measured: changes.length,
      improved: rate(improved, changes.length),
      avgChange: changes.length ? Math.round((changes.reduce((s, c) => s + c, 0) / changes.length) * 10) / 10 : null,
    },
  };
}
