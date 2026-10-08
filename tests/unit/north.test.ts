import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));

describe('norte del día', () => {
  it('el enemigo principal es el más frecuente; a igualdad, el más reciente', async () => {
    const { topEnemy } = await import('@/lib/north');
    expect(topEnemy([])).toBeNull();
    expect(topEnemy([
      { enemy: 'duda', occurred_at: '2026-10-01T10:00:00Z' },
      { enemy: 'critico', occurred_at: '2026-10-02T10:00:00Z' },
      { enemy: 'duda', occurred_at: '2026-10-03T10:00:00Z' },
    ])?.id).toBe('duda');
    expect(topEnemy([
      { enemy: 'duda', occurred_at: '2026-10-01T10:00:00Z' },
      { enemy: 'miedo', occurred_at: '2026-10-05T10:00:00Z' },
    ])?.id).toBe('miedo');
  });
});

describe('Cierre del día (Moment oficial)', () => {
  it('es válido, cita la fuente de cada paso y recoge victoria, aprendizaje, gratitud y mañana', async () => {
    const { officialMoment } = await import('@/config/official-moments');
    const { parseBlocks } = await import('@/config/actions');
    const m = officialMoment('cierre_del_dia')!;
    expect(m).toBeTruthy();
    expect(m.cover).toBe('/moments/cierre-del-dia.webp');
    expect(m.eslabon).toBe('resultado');
    const { blocks, errors } = parseBlocks(m.blocks);
    expect(errors).toEqual([]);
    expect(blocks.map((b) => b.type)).toEqual(['breathing', 'reflection', 'reflection', 'gratitude', 'writing', 'visualization']);
    expect(m.blocks.every((b) => b.source && b.source.length > 10)).toBe(true);
    expect(m.blocks.find((b) => b.id === 'tomorrow')?.source).toMatch(/Brian Tracy/);
    expect(m.blocks.find((b) => b.id === 'sats')?.source).toMatch(/Neville Goddard/);
    expect(m.required_minutes).toBe(12);
  });
});
