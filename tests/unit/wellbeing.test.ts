import { describe, expect, it } from 'vitest';
import {
  bandFor, chatRuleObservations, checkinObservations, estimateWellbeing, momentObservations, trendLine, weekEnd,
  wellbeingOutcomes, wellbeingTrend, type Observation,
} from '@/lib/wellbeing';

const NOW = Date.parse('2026-10-23T18:00:00Z');
const ago = (days: number) => new Date(NOW - days * 86_400_000).toISOString();
const ob = (item: Observation['item'], value: number, days = 1, weight = 1): Observation => ({ item, value, weight, at: ago(days), source: 'chat' });

describe('bienestar estimado (WHO-5)', () => {
  it('con los 5 ítems da la escala 0–100 del WHO-5 y confianza alta', () => {
    const obs = (['cheerful', 'calm', 'active', 'rested', 'interest'] as const).flatMap((i) => [ob(i, 4, 1, 1), ob(i, 4, 2, 1)]);
    const e = estimateWellbeing(obs, NOW)!;
    expect(e.score).toBe(80);
    expect(e.band).toBe('bien');
    expect(e.confidence).toBe('alta');
  });

  it('sin evidencia de 3 ítems no estima', () => {
    expect(estimateWellbeing([ob('calm', 1, 1, 2), ob('rested', 1, 1, 2)], NOW)).toBeNull();
  });

  it('los ítems que faltan toman el promedio de los conocidos', () => {
    const e = estimateWellbeing([ob('calm', 2, 1, 1.5), ob('rested', 2, 1, 1.5), ob('active', 2, 1, 1.5)], NOW)!;
    expect(e.score).toBe(40);
    expect(e.band).toBe('bajo');
    expect(e.confidence).toBe('baja');
    expect(e.items.interest.value).toBeNull();
  });

  it('solo cuentan las dos últimas semanas y lo reciente pesa más', () => {
    const old = estimateWellbeing([ob('calm', 0, 20, 3), ob('calm', 5, 1, 1.5), ob('rested', 5, 1, 1.5), ob('active', 5, 1, 1.5)], NOW)!;
    expect(old.items.calm.value).toBe(5);
    const mix = estimateWellbeing([ob('calm', 0, 13, 1), ob('calm', 5, 0, 1), ob('rested', 3, 1, 1.5), ob('active', 3, 1, 1.5)], NOW)!;
    expect(mix.items.calm.value!).toBeGreaterThan(3.5);
  });

  it('cortes del WHO-5', () => {
    expect(bandFor(28)).toBe('muy_bajo');
    expect(bandFor(50)).toBe('bajo');
    expect(bandFor(51)).toBe('bien');
  });
});

describe('señales sin preguntar', () => {
  it('Moments: ánimo de llegada, días que practicó y lo que termina', () => {
    const runs = [
      { started_at: ago(1), completed_at: ago(1), mood_before: 2, mood_after: 4, helped: true },
      { started_at: ago(3), completed_at: ago(3), mood_before: 3, mood_after: 4, helped: true },
      { started_at: ago(4), completed_at: null, mood_before: null, mood_after: null, helped: null },
    ];
    const o = momentObservations(runs, 'America/Mexico_City', NOW);
    expect(o.filter((x) => x.item === 'cheerful')).toHaveLength(4);
    expect(o.find((x) => x.item === 'calm')?.value).toBeCloseTo(1.75);
    expect(o.find((x) => x.item === 'active')?.value).toBe(2.5);
    const interest = o.filter((x) => x.item === 'interest').map((x) => x.value);
    expect(interest).toContain(1 + 4 * (2 / 3));
    expect(interest).toContain(5);
  });

  it('sin Moments no se deduce nada (no usar la app no es estar mal)', () => {
    expect(momentObservations([], 'America/Mexico_City', NOW)).toEqual([]);
  });

  it('check-in: ansiedad baja la calma; energía alta sube la energía', () => {
    expect(checkinObservations([{ at: ago(0), state: 'anxiety' }])).toEqual([expect.objectContaining({ item: 'calm', value: 1.2 })]);
    expect(checkinObservations([{ at: ago(0), state: 'high_energy' }]).map((o) => o.item)).toEqual(['active', 'cheerful']);
  });

  it('reglas del chat: frases típicas y negaciones', () => {
    const items = (t: string) => chatRuleObservations([t], ago(0)).map((o) => o.item).sort();
    expect(items('No he podido dormir y estoy muy ansiosa')).toEqual(['calm', 'rested']);
    expect(items('Hoy dormí bien y me siento feliz')).toEqual(['cheerful', 'rested']);
    expect(items('ya no me siento triste')).toEqual([]);
    expect(items('quiero organizar mi semana')).toEqual([]);
  });
});

describe('evolución', () => {
  const h = (week_end: string, score: number, confidence: 'baja' | 'media' | 'alta' = 'media') => ({ week_end, score, confidence });

  it('desde la primera semana con confianza media hasta la última', () => {
    const t = wellbeingTrend([h('2026-09-06', 20, 'baja'), h('2026-09-13', 40), h('2026-10-18', 56)])!;
    expect(t.baseline.score).toBe(40);
    expect(t.change).toBe(16);
    expect(t.meaningful).toBe(true);
    expect(t.weeks).toBe(5);
    expect(trendLine(t)).toBe('Subiste 16 puntos desde hace 5 semanas. Es un cambio que cuenta.');
  });

  it('semana que cierra en domingo', () => {
    expect(weekEnd('2026-10-23')).toBe('2026-10-25');
    expect(weekEnd('2026-10-25')).toBe('2026-10-25');
    expect(weekEnd('2026-10-26')).toBe('2026-11-01');
  });

  it('panel: mejoraron 10+, recuperados de bienestar bajo y muestra de 4+ semanas', () => {
    const r = wellbeingOutcomes([
      { user_id: 'a', history: [h('2026-09-06', 40), h('2026-10-18', 60)] },
      { user_id: 'b', history: [h('2026-09-06', 70), h('2026-10-18', 58)] },
      { user_id: 'c', history: [h('2026-10-11', 30), h('2026-10-18', 60)] },
    ]);
    expect(r.measured).toBe(2);
    expect(r.improved).toEqual({ num: 1, den: 2 });
    expect(r.worsened).toBe(1);
    expect(r.recovered).toEqual({ num: 1, den: 1 });
    expect(r.avgChange).toBe(4);
  });
});
