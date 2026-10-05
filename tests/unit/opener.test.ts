import { describe, it, expect } from 'vitest';
import { buildOpener, evidenceLine, greetingForHour, memoryLine, type OpenerInput } from '@/lib/opener';
import { summarizeRuns, type RunRow } from '@/lib/rewards';

const base: OpenerInput = {
  name: 'Luis Vargas', hour: 6, today: '2026-10-05', onboardingCompleted: true,
  lastRitualDate: '2026-10-04', ritualAvailable: true, weakestLink: 'accion', lastConversationTitle: null,
};
const NOW = Date.parse('2026-10-05T12:00:00Z');
const run = (daysAgo: number, before: number | null, after: number | null): RunRow => {
  const t = new Date(NOW - daysAgo * 86_400_000).toISOString();
  return { moment_id: 'm1', moment_slug: null, started_at: t, completed_at: t, mood_before: before, mood_after: after, helped: null };
};

describe('saludo: detectar → recordar → sugerir → acompañar', () => {
  it('saluda por hora con el primer nombre', () => {
    expect(greetingForHour(6)).toBe('Buenos días');
    expect(buildOpener(base).text.startsWith('Buenos días, Luis.')).toBe(true);
  });

  it('no supone cómo llega: lo pregunta y ofrece respuestas de un toque', () => {
    const o = buildOpener({ ...base, proposal: { id: 'brian_tracy_5min', title: 'Ritual de 5 minutos', minutes: 5, cover: null } });
    expect(o.text).not.toMatch(/Imagino que|llegas con poca energía/);
    expect(o.text).toContain('¿O cómo llegas hoy: con energía, neutral o con algo de carga?');
    expect(o.replies.map((r) => r.label)).toEqual(['Empezar', 'Con energía', 'Neutral', 'Con algo de carga']);
  });

  it('en la mañana sugiere lo de la mañana y explica por qué con un recuerdo en sus palabras', () => {
    const o = buildOpener({ ...base, proposal: { id: 'x', title: 'Ritual de 5 minutos', minutes: 5, cover: null,
      memory: { title: 'Ritual de 5 minutos', dayLabel: 'jueves', learning: 'Escribir mi día me ordenó la cabeza' } } });
    expect(o.text).toContain('Para empezar la mañana, te propongo «Ritual de 5 minutos» (5 min).');
    expect(o.text).toContain('El jueves lo hiciste y escribiste: «Escribir mi día me ordenó la cabeza».');
    expect(o.text).not.toMatch(/vas con todo|te hizo bien\.$/);
  });

  it('no repite el mismo recuerdo como evidencia y como sugerencia', () => {
    const mem = { title: 'Ritual de 5 minutos', dayLabel: 'ayer', learning: 'Escribir mi día me ordenó la cabeza' };
    const o = buildOpener({ ...base, lastRun: mem, proposal: { id: 'x', title: 'Ritual de 5 minutos', minutes: 5, cover: null, memory: mem } });
    expect(o.text.match(/Ritual de 5 minutos/g)).toHaveLength(1);
    expect(o.text).toContain('Ayer lo hiciste y escribiste');
  });

  it('evidencia concreta en lugar de frases genéricas', () => {
    expect(evidenceLine({ lastRun: { title: 'SATS', dayLabel: 'ayer', evening: true } })).toBe('Ayer cerraste el día con «SATS».');
    expect(evidenceLine({ weekDays: 3 })).toBe('Esta semana ya practicaste 3 días.');
    expect(evidenceLine({ weekDays: 1 })).toBeNull();
    expect(memoryLine({ title: 'X', dayLabel: 'ayer', helped: true })).toBe('Ayer lo hiciste y marcaste que te ayudó.');
  });

  it('con evidencia de ánimo bajo dice "quizá", nunca lo afirma', () => {
    const progress = summarizeRuns([run(1, 2, 3), run(2, 2, 3)], 0, NOW);
    const o = buildOpener({ ...base, progress, lastRitualDate: '2026-10-05' });
    expect(o.text).toContain('quizá hoy te venga bien empezar suave');
  });

  it('si dijo cómo llega, lo usa y pregunta si lo hacen', () => {
    const o = buildOpener({ ...base, checkin: 'anxiety', proposal: { id: 'x', title: 'Volver al cuerpo', minutes: 4, cover: null } });
    expect(o.text).toContain('Me dijiste que hoy llegas con ansiedad; vamos con calma.');
    expect(o.text).toContain('¿Lo hacemos?');
  });

  it('lo planeado en Mi día y los retos tienen prioridad', () => {
    expect(buildOpener({ ...base, proposal: { id: 'm', title: 'Pausa', minutes: 5, cover: null, planned: true } }).text).toContain('En tu día sigue «Pausa».');
    expect(buildOpener({ ...base, proposal: { id: 'm', title: 'Reto', minutes: 5, cover: null, challengeDay: 3 } }).text).toContain('Hoy toca el día 3 de «Reto».');
  });

  it('racha sin castigo tras 2+ días', () => {
    expect(buildOpener({ ...base, lastRitualDate: '2026-10-01' }).text).toContain('Ayer no te vimos, pero aquí seguimos. ¿Retomamos?');
  });

  it('agentes del sidebar (incluido Napoleon Hill) tienen su propio saludo', () => {
    expect(buildOpener({ ...base, agent: 'meditacion' }).text).toContain('pausa');
    expect(buildOpener({ ...base, agent: 'napoleon_hill' }).text).toContain('¿qué quieres exactamente');
  });
});

describe('rewards', () => {
  it('cuenta la semana, el alza de ánimo y el Moment que más ayuda', () => {
    const p = summarizeRuns([run(1, 2, 4), run(2, 3, 4), { ...run(9, 3, 3), moment_id: 'm2' }], 4, NOW);
    expect(p.weekRuns).toBe(2);
    expect(p.best?.key).toBe('m1');
  });
});
