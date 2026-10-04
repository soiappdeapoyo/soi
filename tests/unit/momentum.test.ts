import { describe, it, expect } from 'vitest';
import { computeMomentum, detectMomentumState, momentumDirectorPrompt, STATE_INTERVENTION, decideToday, inferState, type MomentumEvent, type TodayInput } from '@/lib/momentum';
import { transformationScore, impactScore, creatorShare } from '@/config/creators';
import { scaleSteps } from '@/lib/social/adapt';
import { computeAchievements } from '@/lib/achievements';

const now = new Date('2026-10-10T12:00:00Z');
const day = (d: number, kind: MomentumEvent['kind']): MomentumEvent => ({ kind, created_at: new Date(now.getTime() - d * 86_400_000).toISOString() });

describe('computeMomentum', () => {
  it('sin actividad da 0 y señales amables por retomar', () => {
    const m = computeMomentum([], 0, now);
    expect(m.score).toBe(0);
    expect(m.signals.every((s) => !s.positive)).toBe(true);
    expect(m.signals[0]!.label).toContain('Por retomar');
  });

  it('una semana completa y constante se acerca a 100', () => {
    const events = [0, 1, 2, 3, 4, 5, 6].flatMap((d) => [day(d, 'return'), day(d, 'ritual_completed')]);
    events.push(day(1, 'evidence_saved'), day(2, 'goal_set'), day(2, 'reflection'), day(3, 'reflection'), day(4, 'reflection'));
    events.push(day(1, 'blueprint_step'), day(2, 'blueprint_step'), day(3, 'blueprint_implemented'));
    events.push(day(1, 'video_watched'), day(4, 'video_watched'));
    const m = computeMomentum(events, 21, now);
    expect(m.score).toBeGreaterThanOrEqual(85);
    expect(m.activeDays).toBe(7);
  });

  it('ignora eventos de hace más de 7 días', () => {
    expect(computeMomentum([day(10, 'ritual_completed')], 0, now).score).toBe(0);
  });
});

describe('detectMomentumState', () => {
  const base = { message: 'hola', score: 40, goalsCount: 1 };
  it('la ansiedad tiene prioridad', () => expect(detectMomentumState({ ...base, score: 90, message: 'tengo mucha ansiedad hoy' })).toBe('anxiety'));
  it('confusión por lenguaje o por exceso de metas', () => {
    expect(detectMomentumState({ ...base, message: 'no sé por dónde empezar' })).toBe('confusion');
    expect(detectMomentumState({ ...base, goalsCount: 8 })).toBe('confusion');
  });
  it('energía alta con buen score', () => expect(detectMomentumState({ ...base, score: 70 })).toBe('high_energy'));
  it('energía baja por defecto', () => expect(detectMomentumState({ ...base, score: 10 })).toBe('low_energy'));
  it('mapea estado → intervención y lo inyecta en el prompt', () => {
    expect(STATE_INTERVENTION.anxiety).toBe('REGULATE');
    expect(momentumDirectorPrompt('confusion', { score: 20, signals: [] })).toContain('CLARIFY');
  });
});

describe('creadores', () => {
  it('Transformation Score premia completitud y retención, no solo alcance', () => {
    const big = transformationScore({ implementations: 5000, completions: 50, active_last_14d: 100, results_reported: 10 });
    const small = transformationScore({ implementations: 300, completions: 210, active_last_14d: 240, results_reported: 150 });
    expect(small).toBeGreaterThan(big);
    expect(transformationScore({ implementations: 0, completions: 0, active_last_14d: 0, results_reported: 0 })).toBe(0);
  });
  it('Impact Score y reparto', () => {
    expect(impactScore({ implementations_count: 10, completions_count: 2, steps_completed_count: 10 })).toBe(18);
    expect(creatorShare(1900)).toBe(1520);
  });
});

describe('scaleSteps', () => {
  const steps = [{ title: 'Moverse', minutes: 20 }, { title: 'Reflexionar', minutes: 20 }, { title: 'Crecer', minutes: 20 }];
  it('reduce proporcionalmente a los minutos disponibles', () => {
    expect(scaleSteps(steps, 15).map((s) => s.minutes)).toEqual([5, 5, 5]);
  });
  it('no cambia nada si hay tiempo de sobra', () => expect(scaleSteps(steps, 90)).toEqual(steps));
  it('cada paso conserva al menos 1 minuto', () => expect(scaleSteps(steps, 1).every((s) => s.minutes >= 1)).toBe(true));
});

describe('decideToday', () => {
  const base: TodayInput = {
    checkin: null, score: 40, weakestLink: null, goalsCount: 1, pendingActions: 0,
    activeImplementation: false, unreflectedVideo: false, ritualDoneToday: true, ritualAvailable: true,
  };
  it('la ansiedad regula antes que cualquier otra cosa', () => {
    expect(decideToday({ ...base, checkin: 'anxiety', unreflectedVideo: true, pendingActions: 3 }).mode).toBe('REGULATE');
  });
  it('después de un video pide UNA reflexión', () => expect(decideToday({ ...base, unreflectedVideo: true }).mode).toBe('REFLECT'));
  it('confusión → aclarar', () => expect(decideToday({ ...base, checkin: 'confusion' }).mode).toBe('CLARIFY'));
  it('energía alta con acciones pendientes → ejecutar', () => expect(decideToday({ ...base, checkin: 'high_energy', pendingActions: 2 }).mode).toBe('EXECUTE'));
  it('energía alta con Blueprint activo → continuar', () => expect(decideToday({ ...base, checkin: 'high_energy', activeImplementation: true }).mode).toBe('CONTINUE'));
  it('energía baja con ritual pendiente → continuar con algo pequeño', () => expect(decideToday({ ...base, ritualDoneToday: false }).mode).toBe('CONTINUE'));
  it('energía baja sin nada pendiente → inspirar, no exigir', () => expect(decideToday(base).mode).toBe('INSPIRE'));
  it('sin check-in infiere el estado', () => {
    expect(inferState({ checkin: null, score: 70, goalsCount: 1, weakestLink: null })).toBe('high_energy');
    expect(inferState({ checkin: null, score: 70, goalsCount: 8, weakestLink: null })).toBe('confusion');
  });
});

describe('computeMomentum · inspiración', () => {
  it('ver videos recomendados suma y aparece como señal', () => {
    const at = new Date().toISOString();
    const m = computeMomentum([{ kind: 'video_watched', created_at: at }, { kind: 'video_watched', created_at: at }], 0);
    expect(m.counts.video_watched).toBe(2);
    expect(m.signals.some((s) => s.positive && s.label.includes('video'))).toBe(true);
  });
});

describe('computeAchievements', () => {
  it('desbloquea hitos según lo logrado y deja el resto por lograr', () => {
    const a = computeAchievements({ streakLongest: 21, evidences: 12, moments: 1, sharedMoments: 0, implementations: 1, completedImplementations: 0, videoReflections: 1, isCreator: false });
    const on = new Set(a.filter((x) => x.unlocked).map((x) => x.id));
    expect(on.has('streak-7') && on.has('streak-21') && !on.has('streak-40')).toBe(true);
    expect(on.has('evidence-10') && !on.has('evidence-50')).toBe(true);
    expect(on.has('first-reflection') && !on.has('creator')).toBe(true);
  });
});
