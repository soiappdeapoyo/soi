import { describe, it, expect } from 'vitest';
import { stems, overlap, rankBySimilarity } from '@/lib/ai/similarity';
import { mergeTalks, whenText, continuityPrompt } from '@/lib/ai/continuity';
import { isNearDuplicate, reusePrompt } from '@/lib/moments/reuse';
import { officialMoment } from '@/config/official-moments';

describe('similitud por reglas', () => {
  it('reconoce el mismo tema dicho de otra forma (raíces, sin acentos ni palabras vacías)', () => {
    const a = stems('Tengo mucha ansiedad por el trabajo y no puedo dormir');
    const b = stems('otra vez ansiosa con mi trabajo, me cuesta dormirme');
    expect(overlap(a, b)).toBeGreaterThan(0.5);
    expect(overlap(a, stems('quiero ahorrar dinero para un viaje'))).toBe(0);
  });
  it('ordena por parecido y descarta lo que no se parece', () => {
    const items = [{ t: 'Dinero y ahorro para mi negocio' }, { t: 'Calmar la ansiedad antes de dormir' }, { t: 'Rutina de ejercicio' }];
    const r = rankBySimilarity('no puedo dormir por la ansiedad', items, (x) => x.t);
    expect(r.map((x) => x.t)).toEqual(['Calmar la ansiedad antes de dormir']);
  });
});

describe('continuidad', () => {
  const t = (id: string, score: number) => ({ conversationId: id, at: '2026-10-03T15:00:00Z', said: `dije ${id}`, replied: 'respondí', score });
  it('una por conversación, sin la actual, las 2 mejores', () => {
    const r = mergeTalks([t('a', 0.5), t('b', 0.4)], [t('a', 0.8), t('c', 0.7), t('cur', 0.99)], 'cur');
    expect(r.map((x) => [x.conversationId, x.score])).toEqual([['a', 0.8], ['c', 0.7]]);
  });
  it('fechas humanas en la zona de la persona y un bloque que pide relacionarlo', () => {
    const now = Date.parse('2026-10-06T18:00:00Z');
    expect(whenText('2026-10-05T18:00:00Z', 'America/Mexico_City', now)).toBe('ayer');
    expect(whenText('2026-10-03T18:00:00Z', 'America/Mexico_City', now)).toBe('hace 3 días');
    expect(whenText('2026-09-20T18:00:00Z', 'America/Mexico_City', now)).toBe('el 20 de septiembre');
    const p = continuityPrompt([t('a', 0.8)], 'America/Mexico_City', now);
    expect(p).toContain('hace 3 días dijo: «dije a»');
    expect(p).toContain('Hace unos días me contabas');
    expect(continuityPrompt([], 'America/Mexico_City')).toBe('');
  });
});

describe('reutilizar antes de crear', () => {
  const sats = officialMoment('neville_sats')!;
  it('casi idéntico (mismo flujo y título parecido) no se duplica; otro flujo sí es nuevo', () => {
    expect(isNearDuplicate({ title: sats.title, objective: sats.objective, blocks: sats.blocks }, sats)).toBe(true);
    expect(isNearDuplicate({ title: sats.title, objective: sats.objective, blocks: sats.blocks.slice(1) }, sats)).toBe(false);
  });
  it('el bloque del prompt ofrece reutilizar, ajustar como versión o crear solo si nada sirve', () => {
    const p = reusePrompt([{ ref: 'm1', title: 'Calma nocturna', kind: 'recovery', minutes: 8, runs: 3, helped: 2, score: 0.7 }]);
    expect(p).toContain('offerMoment');
    expect(p).toContain('basedOn');
    expect(p).toContain('lo vivió 3 veces, le ayudó 2');
    expect(reusePrompt([{ ref: 'm1', title: 'X', kind: 'daily', minutes: 5, runs: 0, helped: 0, score: 1 }], false)).not.toContain('basedOn');
  });
});
