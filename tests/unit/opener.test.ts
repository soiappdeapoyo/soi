import { describe, it, expect } from 'vitest';
import { anticipate, buildOpener, greetingForHour, type OpenerInput } from '@/lib/opener';
import { summarizeRuns, pickCelebration, type RunRow } from '@/lib/rewards';

const base: OpenerInput = {
  name: 'Ana López', hour: 9, today: '2026-10-03', onboardingCompleted: true,
  lastRitualDate: '2026-10-02', ritualAvailable: true, weakestLink: 'accion', lastConversationTitle: null,
};
const NOW = Date.parse('2026-10-03T12:00:00Z');
const run = (daysAgo: number, before: number | null, after: number | null, extra: Partial<RunRow> = {}): RunRow => {
  const t = new Date(NOW - daysAgo * 86_400_000).toISOString();
  return { moment_id: 'm1', moment_slug: null, started_at: t, completed_at: t, mood_before: before, mood_after: after, helped: null, ...extra };
};

describe('buildOpener', () => {
  it('saluda por hora y con el primer nombre', () => {
    expect(greetingForHour(7)).toBe('Buenos días');
    expect(greetingForHour(15)).toBe('Buenas tardes');
    expect(greetingForHour(23)).toBe('Buenas noches');
    expect(buildOpener(base).text.startsWith('Buenos días, Ana.')).toBe(true);
  });

  it('persona nueva: se presenta y aun así propone algo', () => {
    const o = buildOpener({ ...base, onboardingCompleted: false, proposal: { id: 'brian_tracy_5min', title: 'Ritual de 5 minutos', minutes: 5, cover: null } });
    expect(o.text).toContain('Soy SOI');
    expect(o.proposal?.id).toBe('brian_tracy_5min');
    expect(o.replies[0]?.href).toBe('/m/brian_tracy_5min/play');
  });

  it('es agéntico: propone un Moment concreto con botón y respuestas rápidas', () => {
    const o = buildOpener({ ...base, checkin: 'anxiety', proposal: { id: 'x', title: 'Volver al cuerpo', minutes: 4, cover: null } });
    expect(o.text).toContain('Imagino que hoy llegas con la mente acelerada');
    expect(o.text).toContain('Te propongo «Volver al cuerpo» (4 min)');
    expect(o.replies.map((r) => r.label)).not.toContain('Me siento con ansiedad');
    expect(o.replies.length).toBeGreaterThanOrEqual(3);
  });

  it('si un Moment ya le ayudó, lo dice con su dato', () => {
    const o = buildOpener({ ...base, proposal: { id: 'x', title: 'Calma', minutes: 3, cover: null, helpedBefore: true, lift: 1.5 } });
    expect(o.text).toContain('te subió el ánimo 1,5 puntos');
  });

  it('celebra el progreso real (recompensa)', () => {
    const progress = summarizeRuns([run(1, 2, 4), run(2, 3, 4), run(3, 2, 3)], 6, NOW);
    expect(buildOpener({ ...base, progress }).text).toMatch(/Mañana llegas a 7|más que la anterior|tu ánimo sube/);
  });

  it('racha sin castigo tras 2+ días', () => {
    expect(buildOpener({ ...base, lastRitualDate: '2026-09-30' }).text).toContain('Ayer no te vimos, pero aquí seguimos. ¿Retomamos?');
  });

  it('ofrece el ritual por la mañana si no hay propuesta (y no si está bloqueado)', () => {
    expect(buildOpener(base).practice?.href).toBe('/ritual');
    expect(buildOpener({ ...base, ritualAvailable: false }).practice).toBeNull();
  });

  it('menciona la última conversación y ofrece seguirla', () => {
    const o = buildOpener({ ...base, hour: 16, lastRitualDate: '2026-10-03', lastConversationTitle: 'mi miedo a hablar en público' });
    expect(o.text).toContain('«mi miedo a hablar en público»');
    expect(o.replies.some((r) => r.label.startsWith('Seguir con'))).toBe(true);
  });

  it('agente elegido en el sidebar tiene su propio saludo', () => {
    expect(buildOpener({ ...base, agent: 'meditacion' }).text).toContain('pausa');
  });
});

describe('anticipate', () => {
  it('el check-in de hoy manda', () => expect(anticipate({ ...base, checkin: 'confusion' }).state).toBe('confusion'));
  it('ánimo bajo al llegar a sus Moments → poca energía (o ansiedad si es su emoción dominante)', () => {
    const progress = summarizeRuns([run(1, 2, 3), run(2, 2, 3)], 0, NOW);
    expect(anticipate({ ...base, progress }).state).toBe('low_energy');
    expect(anticipate({ ...base, progress, dominantEmotion: 'Ansiedad' }).state).toBe('anxiety');
  });
});

describe('rewards', () => {
  it('cuenta la semana, el alza de ánimo y el Moment que más ayuda', () => {
    const p = summarizeRuns([run(1, 2, 4, { helped: true }), run(2, 3, 4), run(9, 3, 3, { moment_id: 'm2' })], 4, NOW);
    expect(p.weekRuns).toBe(2);
    expect(p.prevWeekRuns).toBe(1);
    expect(p.moodLift).toBe(1); // (2 + 1 + 0) / 3 en los últimos 14 días
    expect(p.best?.key).toBe('m1');
    expect(p.nextMilestone).toBe(7);
    expect(p.daysToMilestone).toBe(3);
  });
  it('sin datos no inventa celebraciones', () => {
    expect(pickCelebration(summarizeRuns([], 0, NOW), 1)).toBeNull();
  });
});
