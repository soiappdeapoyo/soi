import { describe, it, expect } from 'vitest';
import { LIFE_AREAS } from '@/config/life-areas';
import { VALUES, valueById, type Value } from '@/config/values';
import { AGENTS } from '@/config/agents';
import { AGENT_SPECS } from '@/lib/ai/prompts/agent-specs';
import { RouterSchema } from '@/lib/ai/router';
import { SITUATIONS } from '@/config/situations';
import { OFFICIAL_CHALLENGES } from '@/config/official-challenges';
import { buildMapView, type Assessment, type LifeMap } from '@/lib/life-map';
import { detectConflicts } from '@/lib/values';
import {
  activeBelief, addPractice, applyBeliefInput, beliefMomentBlocks, beliefStage, findSimilar, practiceDays, readBelief, type Belief,
} from '@/lib/beliefs';
import { detectDrift, driftLine, practicesOf, runsOf, whatWorks, whatWorksLines, whatWorksPrompt, type RunSample } from '@/lib/what-works';
import { addDays, dueLearnings, learningMetadata, learningPrompt, readLearning } from '@/lib/learning';
import { groupByMonth, pauseEvents, pausesFrom, yearAgo, type TimelineEvent } from '@/lib/timeline';
import { chapterDue, chapterPeriod, daysUntilNext, snapshotLines } from '@/lib/chapters';
import { computeOutcomes } from '@/lib/admin/outcomes';
import { parseBlocks } from '@/config/actions';

const DAY = 86_400_000;
const NOW = Date.parse('2026-10-17T12:00:00Z');
const at = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const all = (n: number) => Object.fromEntries(LIFE_AREAS.map((a) => [a.id, n]));

describe('áreas y valores', () => {
  it('espiritualidad es un área con su punto de partida', () => {
    expect(LIFE_AREAS.map((a) => a.id)).toContain('espiritualidad');
  });
  it('cada valor vive en áreas que existen', () => {
    const ids = new Set(LIFE_AREAS.map((a) => a.id as string));
    for (const v of VALUES) for (const a of v.areas) expect(ids.has(a)).toBe(true);
  });

  const map: LifeMap = { vision: null, focus_areas: ['trabajo', 'dinero'], areas: {}, created_at: at(40), updated_at: at(40) };
  const v = (id: string) => valueById(id) as Value;

  it('valor con su área baja y fuera del enfoque → conflicto', () => {
    const view = buildMapView(map, [{ id: 'a', kind: 'inicial', scores: { ...all(6), relaciones: 3 }, created_at: at(30) } as Assessment], [], NOW);
    const c = detectConflicts([v('familia')], view.areas);
    expect(c[0]).toMatchObject({ kind: 'low' });
    expect(c[0]!.text).toContain('Familia');
  });

  it('valor sin evidencia en el mes, con la persona activa en otras áreas → conflicto', () => {
    const view = buildMapView(map, [{ id: 'a', kind: 'inicial', scores: all(6), created_at: at(30) } as Assessment],
      [1, 2, 3, 4].map((d) => ({ at: at(d), capacities: ['Enfoque'], weight: 1 })), NOW);
    const c = detectConflicts([v('salud')], view.areas);
    expect(c.map((x) => x.kind)).toContain('neglected');
  });

  it('sin actividad no es conflicto, es pausa; y el enfoque que no toca ningún valor se pregunta', () => {
    const view = buildMapView(map, [{ id: 'a', kind: 'inicial', scores: all(6), created_at: at(30) } as Assessment], [], NOW);
    const c = detectConflicts([v('salud'), v('fe')], view.areas);
    expect(c.map((x) => x.kind)).toEqual(['focus']);
  });
});

describe('creencias', () => {
  const row = (meta: Record<string, unknown>) => readBelief({ id: 'b1', title: 'no soy constante', metadata: meta, created_at: at(10) });

  it('lee lo guardado y reconoce la misma creencia dicha de otra forma', () => {
    const b = row({ old: 'no soy constante con nada', next: null, seen: [], practices: [] });
    expect(findSimilar([b], 'Es que nunca soy constante con nada')).toBe(b);
    expect(findSimilar([b], 'el dinero no es para mí')).toBeNull();
  });

  it('registrar de nuevo suma una aparición por día y conserva la creencia nueva', () => {
    const b = row({ old: 'no soy constante', next: 'estoy aprendiendo a volver', seen: [{ at: '2026-10-10T10:00:00Z', said: 'x' }], practices: [] });
    const n = applyBeliefInput(b, { belief: 'no soy constante', said: 'otra vez lo dejé' }, '2026-10-17T10:00:00Z');
    expect(n.seen).toHaveLength(2);
    expect(n.next).toBe('estoy aprendiendo a volver');
    expect(applyBeliefInput({ ...b, ...n } as Belief, { belief: 'no soy constante' }, '2026-10-17T18:00:00Z').seen).toHaveLength(2);
  });

  it('las prácticas cuentan una por día y fuente; las etapas suben con los días', () => {
    let p = addPractice({ practices: [] }, 'moment', '2026-10-01T10:00:00Z');
    p = addPractice({ practices: p }, 'moment', '2026-10-01T20:00:00Z');
    expect(p).toHaveLength(1);
    expect(beliefStage({ practices: p, next: null })).toBe('detectada');
    expect(beliefStage({ practices: p, next: 'algo' })).toBe('entrenando');
    const many = Array.from({ length: 21 }, (_, i) => ({ at: new Date(Date.parse('2026-09-01T12:00:00Z') + i * DAY).toISOString(), source: 'moment' as const }));
    expect(practiceDays({ practices: many })).toBe(21);
    expect(beliefStage({ practices: many, next: 'algo' })).toBe('tuya');
  });

  it('la activa es la más vista que aún no es suya', () => {
    const a = row({ old: 'a', seen: [{ at: at(1), said: '' }], practices: [] });
    const b = { ...row({ old: 'b', seen: [{ at: at(2), said: '' }, { at: at(3), said: '' }], practices: [] }), id: 'b2' };
    expect(activeBelief([a, b])?.id).toBe('b2');
  });

  it('su Moment es válido y cita fuentes', () => {
    const blocks = beliefMomentBlocks({ old: 'no soy constante', next: 'estoy aprendiendo a volver' });
    expect(parseBlocks(blocks).errors).toEqual([]);
    expect(blocks.filter((b) => b.type !== 'breathing').every((b) => b.source)).toBe(true);
  });
});

describe('lo que te funciona y el abandono', () => {
  const run = (hour: number, done: boolean, types: RunSample['types'], helped: boolean | null = true, minutes = 5): RunSample => ({
    started_at: at(1), completed_at: done ? at(1) : null, hour, minutes, types, mood_before: 2, mood_after: done ? 4 : null, helped: done ? helped : null,
  });

  it('con pocos Moments no afirma nada', () => {
    expect(whatWorks([run(8, true, ['breathing'])]).enough).toBe(false);
    expect(whatWorksLines(whatWorks([]))).toEqual([]);
  });

  it('encuentra la hora, la duración y la práctica que más le sirven', () => {
    const runs = [
      ...Array.from({ length: 5 }, () => run(8, true, ['breathing', 'writing'])),
      run(21, false, ['meditation']), run(21, false, ['meditation']), run(21, true, ['meditation'], false, 20), run(21, true, ['meditation'], false, 20),
    ];
    const w = whatWorks(runs);
    expect(w.enough).toBe(true);
    expect(w.bestPart?.part).toBe('manana');
    expect(w.bestLength).toBe('corto');
    expect(w.helps).toContain('respirar');
    expect(w.notHelps).toContain('meditar');
    expect(whatWorksPrompt(w)).not.toMatch(/\d/);
  });

  it('agrupa los bloques en prácticas reconocibles', () => {
    expect(practicesOf(['breathing', 'body_scan', 'reframe'])).toEqual(['respirar', 'escribir']);
  });

  it('rachas y hábitos que se caen (nunca dos veces seguidas)', () => {
    expect(runsOf(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05'])).toEqual([3, 1]);
    const d = detectDrift([{ name: 'Leer', tiny: 'Una página', moment_id: 'm1', days: ['2026-10-10', '2026-10-11', '2026-10-12', '2026-10-14', '2026-10-15'] }], '2026-10-17');
    expect(d[0]).toMatchObject({ name: 'Leer', daysOff: 1, typicalRun: 2 });
    expect(driftLine(d[0]!)).toContain('«Una página»');
    // Ayer sí lo hizo: no hay abandono.
    expect(detectDrift([{ name: 'Leer', moment_id: 'm1', days: ['2026-10-14', '2026-10-15', '2026-10-16'] }], '2026-10-17')).toEqual([]);
  });
});

describe('aprendizaje', () => {
  it('pregunta si funcionó a los 3 días, solo si hubo acción y sin perseguir', () => {
    const meta = learningMetadata({ source: 'Hábitos atómicos', kind: 'libro', learned: 'Empezar en pequeño', action: 'Leer una página' }, '2026-10-10');
    expect(meta.check_on).toBe('2026-10-13');
    const l = readLearning({ id: 'l1', title: 'x', metadata: meta, created_at: at(7) });
    expect(dueLearnings([l], '2026-10-12')).toEqual([]);
    expect(dueLearnings([l], '2026-10-13')).toHaveLength(1);
    expect(dueLearnings([l], addDays('2026-10-13', 30))).toEqual([]);
    expect(dueLearnings([{ ...l, outcome: 'funciono' }], '2026-10-14')).toEqual([]);
    expect(learningPrompt([l])).toContain('Leer una página');
    const none = readLearning({ id: 'l2', title: 'x', metadata: learningMetadata({ source: 'Video', kind: 'video', learned: 'Algo' }, '2026-10-10'), created_at: at(7) });
    expect(none.check_on).toBeNull();
  });
});

describe('tu historia', () => {
  it('las pausas de 7+ días se cuentan como regresos', () => {
    expect(pausesFrom(['2026-09-01', '2026-09-02', '2026-09-12'])).toEqual([{ from: '2026-09-02', to: '2026-09-12', days: 9 }]);
    expect(pauseEvents(['2026-09-01', '2026-09-03'])).toEqual([]);
  });

  it('agrupa por mes, lo reciente primero y sin duplicados', () => {
    const ev: TimelineEvent[] = [
      { at: '2026-09-03T12:00:00Z', kind: 'decision', title: 'Cambiar de trabajo' },
      { at: '2026-10-05T12:00:00Z', kind: 'evidencia', title: 'Corrí 5 km' },
      { at: '2026-10-05T13:00:00Z', kind: 'evidencia', title: 'Corrí 5 km' },
    ];
    const g = groupByMonth(ev, 'America/Mexico_City');
    expect(g.map((x) => x.label)).toEqual(['octubre de 2026', 'septiembre de 2026']);
    expect(g[0]!.events).toHaveLength(1);
  });

  it('hace un año: lo más cercano a 365 días', () => {
    const ev: TimelineEvent[] = [{ at: at(366), kind: 'decision', title: 'Empezar a escribir' }, { at: at(200), kind: 'decision', title: 'Otra' }];
    expect(yearAgo(ev, NOW)?.title).toBe('Empezar a escribir');
  });
});

describe('capítulos', () => {
  it('cada 91 días un capítulo; el cuarto es el año', () => {
    expect(chapterPeriod('2026-01-01', 1)).toMatchObject({ kind: 'trimestral', period_end: '2026-04-02' });
    expect(chapterPeriod('2026-01-01', 4).kind).toBe('anual');
  });

  it('se abre unos días antes y no se repite al cerrarlo', () => {
    expect(chapterDue('2026-01-01', [], '2026-03-20')).toBeNull();
    const due = chapterDue('2026-01-01', [], '2026-03-30');
    expect(due?.period_end).toBe('2026-04-02');
    expect(chapterDue('2026-01-01', ['2026-04-02'], '2026-04-10')).toBeNull();
    expect(daysUntilNext('2026-01-01', '2026-04-10')).toBe(83);
  });

  it('el año pendiente manda sobre el trimestre siguiente recién abierto', () => {
    const year = chapterPeriod('2025-01-01', 4);
    const due = chapterDue('2025-01-01', [], addDays(year.period_end, 3));
    expect(due?.kind).toBe('anual');
  });

  it('la foto del capítulo en palabras', () => {
    expect(snapshotLines({ moments: 12, practice_days: 1, evidence: 0 })).toEqual(['12 Moments vividos', '1 día de práctica']);
  });
});

describe('coaches, rutinas por situación y el plan de manifestación', () => {
  it('Covey y Rohn tienen ficha y el router los conoce', () => {
    for (const id of ['stephen_covey', 'jim_rohn'] as const) {
      expect(AGENTS[id]).toBeTruthy();
      expect(AGENT_SPECS[id].knowledge.length).toBeGreaterThan(0);
      expect(RouterSchema.shape.agent.options).toContain(id);
    }
  });
  it('cada situación abre un agente que existe', () => {
    for (const s of SITUATIONS) expect(AGENTS[s.agent]).toBeTruthy();
  });
  it('el reto de manifestación es válido y cada bloque con técnica cita su fuente', () => {
    const m = OFFICIAL_CHALLENGES.find((c) => c.slug === 'reto_manifestar_7')!;
    expect(parseBlocks(m.blocks).errors).toEqual([]);
    expect(m.blocks.filter((b) => b.type !== 'celebration').every((b) => b.source)).toBe(true);
  });
});

describe('resultados del panel', () => {
  it('activación, retención por cohorte y transformación', () => {
    const users = [{ id: 'u1', created_at: at(70) }, { id: 'u2', created_at: at(70) }, { id: 'u3', created_at: at(1) }];
    const act = [
      { user_id: 'u1', at: at(69), kind: 'moment' as const }, { user_id: 'u1', at: at(61), kind: 'message' as const }, { user_id: 'u1', at: at(30), kind: 'message' as const },
      { user_id: 'u2', at: at(70), kind: 'message' as const },
    ];
    const maps = [{ user_id: 'u1', focus: ['salud'], assessments: [{ kind: 'inicial', scores: { salud: 4 }, created_at: at(65) }, { kind: 'mensual', scores: { salud: 6 }, created_at: at(10) }] }];
    const o = computeOutcomes(users, act, maps, NOW);
    expect(o.activation).toMatchObject({ num: 1, den: 2, pct: 50 });
    expect(o.d1).toMatchObject({ num: 1, den: 2 });
    expect(o.d7).toMatchObject({ num: 1, den: 2 });
    expect(o.d30).toMatchObject({ num: 1, den: 2 });
    expect(o.transformation).toMatchObject({ measured: 1, avgChange: 2 });
    expect(o.transformation.improved.pct).toBe(100);
  });
});
