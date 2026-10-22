import { describe, expect, it } from 'vitest';
import { analyzePmf, pmfFingerprint, pmfSignals, type PmfSnapshot } from '@/lib/admin/pmf';

const r = (num: number, den: number) => ({ num, den });

function snap(over: Partial<PmfSnapshot> = {}): PmfSnapshot {
  return {
    generatedAt: '2026-10-22T15:00:00Z',
    days: 30,
    users: { total: 200, trial: 40, free: 140, plus: 20, newInPeriod: 60 },
    outcomes: {
      signups: 150, activation: r(60, 100), wroteFirst: r(80, 100), d1: r(45, 100), d7: r(30, 100), d30: r(20, 80),
      transformation: { measured: 12, improved: r(8, 12), avgChange: 1.4 },
    },
    funnel: { visitors: 2000, landing: 1800, wanted: 400, authStart: 200, signup: 150, abandonedAfterAuth: 10, referrers: [{ host: 'tiktok', n: 900 }] },
    landingChat: { wrote: 100, designed: 60, started: 40, claimed: 25, lived: 15, errors: [] },
    nav: { sessions: 500, users: 120, pagesPerSession: 4.2, medianSessionMs: 180_000, bounceRate: 0.2, frictions: [] },
    moments: { started: 400, completed: 320, answered: 300, helped: 250, moodPairs: 280, moodDelta: 0.8, completers: 90, repeatCompleters: 40 },
    engagement: { mau: 120, avgDau: 30, activeInPeriod: 110, messages: 3000 },
    ai: { tokens: 1_000_000, crisis: 1, providers: [['deepseek', 800]] },
    ...over,
  };
}

describe('análisis de PMF por reglas', () => {
  it('con datos sanos da señales fuertes y sin cuello de botella', () => {
    const a = analyzePmf(snap());
    expect(a.verdict).toBe('Señales fuertes de PMF');
    expect(a.score).toBeGreaterThanOrEqual(70);
    expect(a.signals.every((s) => s.level === 'fuerte')).toBe(true);
    expect(a.bottleneck).toBeNull();
    expect(a.text).toContain('# Análisis de product-market fit de SOI');
    expect(a.text).toContain('Nada urgente');
  });

  it('el cuello de botella prioriza el valor sobre la adquisición', () => {
    const a = analyzePmf(snap({
      moments: { ...snap().moments, answered: 100, helped: 40 },
      funnel: { ...snap().funnel!, landing: 2000, signup: 10 },
    }));
    expect(a.signals.find((s) => s.id === 'helped')?.level).toBe('debil');
    expect(a.signals.find((s) => s.id === 'signup_rate')?.level).toBe('debil');
    expect(a.bottleneck).toBe('valor');
    expect(a.text).toMatch(/1\. \[Valor · débil\]/);
  });

  it('muestras pequeñas no cuentan y sin suficientes señales no hay veredicto', () => {
    const tiny = snap({
      users: { total: 5, trial: 5, free: 0, plus: 0, newInPeriod: 5 },
      outcomes: { signups: 5, activation: r(1, 3), wroteFirst: r(2, 3), d1: r(1, 3), d7: r(0, 0), d30: r(0, 0), transformation: { measured: 0, improved: r(0, 0), avgChange: null } },
      funnel: null, landingChat: null, nav: null,
      moments: { started: 4, completed: 2, answered: 2, helped: 2, moodPairs: 2, moodDelta: 1, completers: 2, repeatCompleters: 0 },
      engagement: { mau: 4, avgDau: 1, activeInPeriod: 4, messages: 30 },
    });
    const a = analyzePmf(tiny);
    expect(a.signals.every((s) => s.level === 'sin_datos')).toBe(true);
    expect(a.verdict).toBe('Datos insuficientes');
    expect(a.score).toBeNull();
  });

  it('la curva que no se aplana es débil y marca la muestra pequeña', () => {
    const s = pmfSignals(snap({ outcomes: { ...snap().outcomes, d7: r(30, 20), d30: r(2, 20) } }));
    const flat = s.find((x) => x.id === 'flatten')!;
    expect(flat.level).toBe('debil');
    expect(flat.lowConfidence).toBe(true);
  });

  it('sin retención medible el veredicto es provisional', () => {
    const a = analyzePmf(snap({ outcomes: { ...snap().outcomes, d1: r(0, 0), d7: r(0, 0), d30: r(0, 0) } }));
    expect(a.verdict).toMatch(/\(provisional\)$/);
  });

  it('las quejas del chat entran como señal de valor y con su sección y ejemplos', () => {
    const a = analyzePmf(snap({
      conversations: {
        conversations: 100, withComplaint: 20, complaints: 25, leftAfter: 9, oneMessage: 30, avgUserMessages: 4.1, crisisExcluded: 2,
        byCategory: [{ id: 'largo', label: 'Respuestas demasiado largas', count: 15 }],
        byAgent: [{ agent: 'calma', conversations: 40, withComplaint: 12 }], byProvider: [{ provider: 'deepseek', complaints: 20 }],
        examples: [{ category: 'largo', said: 'muy largo', before: 'Texto larguísimo…', agent: 'calma', provider: 'deepseek', tools: [], position: 2, leftAfter: true, ref: { user: 'u-secreto', conversation: 'c-secreto' } }],
      },
    }));
    const chat = a.signals.find((s) => s.id === 'chat_ok')!;
    expect(chat.level).toBe('debil');
    expect(chat.fix).toContain('respuestas demasiado largas');
    expect(a.bottleneck).toBe('valor');
    expect(a.text).toContain('## Conversaciones: lo que no les sirvió');
    expect(a.text).toContain('La persona: «muy largo»');
    expect(a.text).not.toContain('u-secreto');
  });

  it('la huella no depende de la fecha pero sí de los datos', () => {
    const a = analyzePmf(snap());
    const b = analyzePmf(snap({ generatedAt: '2026-10-23T09:00:00Z' }));
    const c = analyzePmf(snap({ users: { ...snap().users, plus: 2 } }));
    expect(pmfFingerprint(a, 30)).toBe(pmfFingerprint(b, 30));
    expect(pmfFingerprint(a, 30)).not.toBe(pmfFingerprint(c, 30));
    expect(pmfFingerprint(a, 30)).not.toBe(pmfFingerprint(a, 7));
  });
});
