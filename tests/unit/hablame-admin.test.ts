import { describe, it, expect } from 'vitest';
import { analyzeHablame, MIN_FOR_VERDICT, type HablameInput, type HMessage } from '@/lib/admin/hablame';

const NOW = Date.UTC(2026, 9, 25, 12);
const DAY = 86_400_000;
const iso = (ms: number) => new Date(ms).toISOString();

/** n mensajes seguidos (1 por minuto) desde `start`, con los eventos que da `ev(i)`. */
function burst(user: string, start: number, n: number, ev: (i: number) => string[], open = 0.5): HMessage[] {
  return Array.from({ length: n }, (_, i) => ({ user_id: user, at: iso(start + i * 60_000), events: ev(i), openness: open }));
}

const empty: HablameInput = {
  accounts: [], funnel: [], personas: [], messages: [], debriefs: [], coachAsks: [], referrals: [],
  reactions: 0, reactors: 0, voiceHeard: 0, crisis: 0, blockedDescriptions: 0, blockedTurns: 0, now: NOW,
};

describe('panel de Háblame', () => {
  it('separa la llegada por SOI de la llegada por /persons/entrar', () => {
    const r = analyzeHablame({
      ...empty,
      accounts: [{ id: 's1', role: 'soi', createdAt: iso(NOW - DAY), plan: 'trial' }, { id: 'p1', role: 'persons', createdAt: iso(NOW - DAY), plan: 'trial' }],
      funnel: [
        { event: 'landing_view', detail: null, visitor_id: 'v1', user_id: null },
        { event: 'login_view', detail: null, visitor_id: 'v1', user_id: null },
        { event: 'login_view', detail: 'persons', visitor_id: 'v2', user_id: null },
        { event: 'login_view', detail: 'persons', visitor_id: 'v2', user_id: null },
        { event: 'signup', detail: 'google', visitor_id: 'v1', user_id: 's1' },
        { event: 'signup', detail: 'google', visitor_id: 'v2', user_id: 'p1' },
      ],
    });
    expect(r.acquisition.soi).toMatchObject({ landing: 1, login: 1, signups: 1 });
    expect(r.acquisition.persons).toMatchObject({ login: 1, signups: 1, accounts: 1 });
  });

  it('activación y retención cuentan solo cuentas de Háblame con edad suficiente', () => {
    const created = NOW - 20 * DAY;
    const r = analyzeHablame({
      ...empty,
      accounts: [
        { id: 'p1', role: 'persons', createdAt: iso(created), plan: 'free' },
        { id: 'p2', role: 'persons', createdAt: iso(created), plan: 'soi_plus' },
        { id: 'new', role: 'persons', createdAt: iso(NOW - 3_600_000), plan: 'trial' },
      ],
      personas: [{ user_id: 'p1' }, { user_id: 'p2' }],
      messages: [
        ...burst('p1', created + 3_600_000, 6, () => []),
        ...burst('p1', created + DAY + 3_600_000, 3, () => []),
        ...burst('p2', created + 3_600_000, 2, () => []),
      ],
    });
    expect(r.activation.createdPersona).toMatchObject({ num: 2, den: 2 });
    expect(r.activation.practiced).toMatchObject({ num: 1, den: 2 });
    expect(r.activation.fullSession).toMatchObject({ num: 1, den: 2 });
    expect(r.retention.d1).toMatchObject({ num: 1, den: 2 });
    expect(r.money.conversion).toMatchObject({ num: 1, den: 2 });
  });

  it('mejora: más preguntas y menos tropiezos con la práctica, y habilidades que suben', () => {
    const users = Array.from({ length: MIN_FOR_VERDICT }, (_, k) => `p${k}`);
    const r = analyzeHablame({
      ...empty,
      accounts: users.map((id) => ({ id, role: 'persons' as const, createdAt: iso(NOW - 30 * DAY), plan: 'trial' })),
      messages: users.flatMap((u) => [
        ...burst(u, NOW - 20 * DAY, 10, (i) => (i % 2 ? ['self_centered'] : ['generic']), 0.4),
        ...burst(u, NOW - 2 * DAY, 10, (i) => (i % 2 ? ['asked_about_her'] : []), 0.7),
      ]),
      debriefs: users.flatMap((u) => [
        { user_id: u, at: iso(NOW - 20 * DAY), source: 'ai', scores: { apertura: 2, curiosidad: 2, reciprocidad: 2, respeto: 4, lectura: 2, cierre: 2 } },
        { user_id: u, at: iso(NOW - 2 * DAY), source: 'ai', scores: { apertura: 3, curiosidad: 4, reciprocidad: 3, respeto: 5, lectura: 3, cierre: 3 } },
      ]),
    });
    expect(r.signals.people).toBe(MIN_FOR_VERDICT);
    expect(r.signals.curiosity.after!).toBeGreaterThan(r.signals.curiosity.before!);
    expect(r.signals.bad.after!).toBeLessThan(r.signals.bad.before!);
    expect(r.signals.openness.after!).toBeGreaterThan(r.signals.openness.before!);
    expect(r.skills.change!).toBeGreaterThan(0);
    expect(r.skills.improved.pct).toBe(100);
    expect(r.skills.perSkill.find((s) => s.id === 'curiosidad')!.change).toBe(2);
    expect(r.verdict.tone).toBe('good');
  });

  it('sin datos suficientes no da un veredicto', () => {
    const r = analyzeHablame(empty);
    expect(r.verdict.label).toMatch(/sin datos/i);
    expect(r.skills.first).toBeNull();
  });
});
