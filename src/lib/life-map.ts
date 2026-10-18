import { z } from 'zod/v3';
import { LIFE_AREAS, LIFE_AREA_IDS, MAX_FOCUS, type LifeArea, type LifeAreaId } from '@/config/life-areas';

/**
 * Tu mapa (puro y testeado): quién eres hoy (la calificación de cada área), quién quieres ser (visión y metas a
 * 90 días de las áreas de enfoque) y la distancia (cuánto falta y cuánto ya se cerró desde el punto de partida).
 * La evidencia de Mi Nuevo Yo cuenta para el área a través de sus capacidades (src/config/life-areas.ts).
 */

export type AreaScores = Partial<Record<LifeAreaId, number>>;
export type AreaGoal = { target?: number; want?: string };
export type AssessmentKind = 'inicial' | 'mensual' | 'semanal';

export type LifeMap = {
  vision: string | null;
  focus_areas: LifeAreaId[];
  areas: Partial<Record<LifeAreaId, AreaGoal>>;
  created_at: string;
  updated_at: string;
};

export type Assessment = { id: string; kind: AssessmentKind; scores: AreaScores; created_at: string };

/** Una evidencia de Mi Nuevo Yo (Moment vivido, reflexión, logro, regreso) con las capacidades que entrenó. */
export type AreaEvidence = { at: string; capacities: readonly string[]; weight: number };

const Score = z.number().int().min(1).max(10);
const AreaKey = z.enum(LIFE_AREA_IDS);

/** Lo que llega del diagnóstico (inicial, mensual o semanal). */
export const AssessmentBody = z.object({
  kind: z.enum(['inicial', 'mensual', 'semanal']),
  scores: z.record(AreaKey, Score),
  focus: z.array(AreaKey).max(MAX_FOCUS).optional(),
  targets: z.record(AreaKey, Score).optional(),
  wants: z.record(AreaKey, z.string().trim().max(200)).optional(),
  vision: z.string().trim().max(400).optional(),
}).superRefine((b, ctx) => {
  const n = Object.keys(b.scores).length;
  if (b.kind !== 'semanal' && n !== LIFE_AREAS.length) ctx.addIssue({ code: 'custom', message: 'Califica todas las áreas.' });
  if (b.kind === 'semanal' && n === 0) ctx.addIssue({ code: 'custom', message: 'Califica al menos un área.' });
});
export type AssessmentInput = z.infer<typeof AssessmentBody>;

/** Cambios al mapa sin medir (visión, enfoque, metas). */
export const MapPatch = z.object({
  vision: z.string().trim().max(400).nullable().optional(),
  focus: z.array(AreaKey).max(MAX_FOCUS).optional(),
  targets: z.record(AreaKey, Score).optional(),
  wants: z.record(AreaKey, z.string().trim().max(200)).optional(),
});

/** Un chequeo completo cada 30 días: suficiente para notar cambios reales sin volverse una tarea. */
export const CHECKIN_EVERY_DAYS = 30;
const DAY = 86_400_000;

/** Las áreas que se sugieren como enfoque: las más bajas (a igualdad, en el orden de LIFE_AREAS). */
export function suggestFocus(scores: AreaScores, n = MAX_FOCUS): LifeAreaId[] {
  return LIFE_AREAS.map((a, i) => ({ id: a.id, s: scores[a.id] ?? 11, i }))
    .filter((x) => x.s <= 10).sort((a, b) => a.s - b.s || a.i - b.i).slice(0, n).map((x) => x.id);
}

/** Aplica metas y descripciones nuevas sobre las que ya había (solo áreas válidas; texto vacío borra). */
export function mergeAreaGoals(prev: LifeMap['areas'], targets: AreaScores = {}, wants: Partial<Record<LifeAreaId, string>> = {}): LifeMap['areas'] {
  const out: LifeMap['areas'] = { ...prev };
  for (const id of LIFE_AREA_IDS) {
    if (targets[id] === undefined && wants[id] === undefined) continue;
    const g: AreaGoal = { ...(out[id] ?? {}) };
    if (targets[id] !== undefined) g.target = targets[id];
    if (wants[id] !== undefined) { if (wants[id]!.trim()) g.want = wants[id]!.trim(); else delete g.want; }
    out[id] = g;
  }
  return out;
}

export type AreaView = {
  area: LifeArea;
  focus: boolean;
  /** Primera calificación (el punto de partida). */
  baseline: number | null;
  /** La más reciente. */
  current: number | null;
  /** La anterior a la más reciente (para "desde la última vez"). */
  previous: number | null;
  target: number | null;
  want: string | null;
  /** current − baseline. */
  change: number | null;
  /** Lo que falta para la meta (nunca negativo). */
  gap: number | null;
  /** Cuánto de la distancia inicial ya se cerró (0–1), si hay meta por encima del punto de partida. */
  closed: number | null;
  evidence7: number;
  evidence30: number;
};

export type MapView = {
  hasMap: boolean;
  vision: string | null;
  areas: AreaView[];
  focus: AreaView[];
  /** Cuándo fue la primera medición. */
  startedAt: string | null;
  /** La última medición completa (inicial o mensual). */
  lastFullAt: string | null;
  checkinDue: boolean;
  /** Días para el próximo chequeo (0 si ya toca). */
  checkinInDays: number | null;
};

export function buildMapView(map: LifeMap | null, assessments: Assessment[], evidence: AreaEvidence[] = [], now = Date.now()): MapView {
  const asc = [...assessments].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
  const full = asc.filter((a) => a.kind !== 'semanal');
  const lastFull = full.at(-1) ?? null;
  const focusSet = new Set(map?.focus_areas ?? []);

  const areas: AreaView[] = LIFE_AREAS.map((area) => {
    const scored = asc.filter((a) => typeof a.scores[area.id] === 'number');
    const baseline = scored[0]?.scores[area.id] ?? null;
    const current = scored.at(-1)?.scores[area.id] ?? null;
    const previous = scored.length > 1 ? scored.at(-2)!.scores[area.id] ?? null : null;
    const goal = map?.areas[area.id] ?? {};
    const target = goal.target ?? null;
    const caps = new Set<string>(area.capacities);
    const hits = evidence.filter((e) => e.capacities.some((c) => caps.has(c)));
    const within = (days: number) => hits.filter((e) => now - Date.parse(e.at) <= days * DAY).reduce((s, e) => s + e.weight, 0);
    return {
      area, focus: focusSet.has(area.id), baseline, current, previous, target, want: goal.want ?? null,
      change: baseline !== null && current !== null ? current - baseline : null,
      gap: target !== null && current !== null ? Math.max(0, target - current) : null,
      closed: target !== null && baseline !== null && current !== null && target > baseline
        ? Math.max(0, Math.min(1, (current - baseline) / (target - baseline))) : null,
      evidence7: within(7), evidence30: within(30),
    };
  });

  const lastFullAt = lastFull?.created_at ?? null;
  const since = lastFullAt ? Math.floor((now - Date.parse(lastFullAt)) / DAY) : null;
  return {
    hasMap: full.length > 0,
    vision: map?.vision?.trim() || null,
    areas,
    // En el orden en que la persona los eligió.
    focus: (map?.focus_areas ?? []).map((id) => areas.find((a) => a.area.id === id)).filter((a): a is AreaView => Boolean(a)),
    startedAt: asc[0]?.created_at ?? null,
    lastFullAt,
    checkinDue: since !== null && since >= CHECKIN_EVERY_DAYS,
    checkinInDays: since === null ? null : Math.max(0, CHECKIN_EVERY_DAYS - since),
  };
}

/** Una línea humana del avance de un área ("Subiste 2 desde el inicio", "Te faltan 3 para tu meta"). */
export function areaLine(a: AreaView): string {
  if (a.current === null) return 'Sin medir todavía';
  if (a.gap === 0 && a.target !== null) return 'Llegaste a tu meta. ¿Subimos un poco más?';
  const parts: string[] = [];
  if (a.change !== null && a.change > 0) parts.push(`Subiste ${a.change} desde el inicio`);
  else if (a.change !== null && a.change < 0) parts.push('Bajó un poco: pasa, y se puede retomar');
  if (a.gap !== null) parts.push(`te ${a.gap === 1 ? 'falta 1' : `faltan ${a.gap}`} para tu meta`);
  const s = parts.join(' · ');
  return s ? s[0]!.toUpperCase() + s.slice(1) : 'Tu punto de partida';
}
