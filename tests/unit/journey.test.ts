import { describe, expect, it } from 'vitest';
import { firstStepsProgress, isBrandNew, nextStep, type JourneyState } from '@/lib/journey';

const now = Date.parse('2026-10-09T12:00:00Z');
const base: JourneyState = { userMessages: 0, completedRuns: 0, firstCompleted: null, followedUp: false, proposal: null, unfinished: null, canRun: true };
const proposal = { id: 'p1', title: 'Soltar la presentación', minutes: 6, href: '/m/p1/play?from=hoy' };
const first = { runId: 'r1', completedAt: new Date(now - 3_600_000).toISOString() };

describe('el siguiente paso', () => {
  it('nueva: cuéntale a SOI cómo llegas', () => {
    expect(nextStep(base, now)).toMatchObject({ kind: 'talk', href: '/chat?nueva=1' });
    expect(isBrandNew(base)).toBe(true);
  });

  it('conversó sin propuesta: seguir con SOI; con propuesta: vivir su primer Moment', () => {
    expect(nextStep({ ...base, userMessages: 2 }, now).kind).toBe('keep_talking');
    expect(nextStep({ ...base, userMessages: 3, proposal }, now)).toMatchObject({ kind: 'first_moment', href: proposal.href });
  });

  it('sin acceso a ejecutar: nunca manda a un Moment que no puede vivir', () => {
    expect(nextStep({ ...base, userMessages: 3, proposal, canRun: false }, now).kind).toBe('keep_talking');
    expect(nextStep({ ...base, unfinished: { title: 'X', href: '/m/x/play', progress: 40 }, canRun: false }, now).kind).toBe('talk');
  });

  it('lo que quedó a medias va primero', () => {
    expect(nextStep({ ...base, userMessages: 3, proposal, unfinished: { title: 'X', href: '/m/x/play', progress: 40 } }, now)).toMatchObject({ kind: 'resume', progress: 40 });
  });

  it('después del primer Moment: el seguimiento, una vez y solo la primera semana', () => {
    const lived = { ...base, userMessages: 3, completedRuns: 1, firstCompleted: first };
    expect(nextStep(lived, now)).toMatchObject({ kind: 'follow_up', href: '/chat?nueva=1&run=r1' });
    expect(nextStep({ ...lived, followedUp: true }, now).kind).toBe('routine');
    expect(nextStep({ ...lived, firstCompleted: { runId: 'r1', completedAt: new Date(now - 8 * 86_400_000).toISOString() } }, now).kind).toBe('routine');
  });

  it('checklist de bienvenida: qué está hecho y qué sigue; desaparece al completarla', () => {
    expect(firstStepsProgress(base, now)).toEqual({ done: [], current: 'talk' });
    expect(firstStepsProgress({ ...base, userMessages: 2 }, now)).toEqual({ done: ['talk'], current: 'moment' });
    expect(firstStepsProgress({ ...base, userMessages: 2, completedRuns: 1, firstCompleted: first }, now)).toEqual({ done: ['talk', 'moment'], current: 'follow_up' });
    expect(firstStepsProgress({ ...base, userMessages: 4, completedRuns: 1, firstCompleted: first, followedUp: true }, now)).toBeNull();
    expect(isBrandNew({ userMessages: 0, completedRuns: 1 })).toBe(false);
  });
});
