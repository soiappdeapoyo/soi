import { describe, expect, it } from 'vitest';
import { RESUME_WINDOW_MS, leftAgo, resumePoint, runProgress } from '@/lib/moments/progress';

// 2 min + 6 min + 2 min = 600 s
const blocks = [{ id: 'a', minutes: 2 }, { id: 'b', minutes: 6 }, { id: 'c', minutes: 2 }];
const now = Date.parse('2026-10-09T12:00:00Z');
const ago = (ms: number) => new Date(now - ms).toISOString();

describe('avance de un Moment', () => {
  it('se mide por tiempo y nunca llega a 100 antes de terminar', () => {
    expect(runProgress(blocks, 0, 120)).toBe(0);
    expect(runProgress(blocks, 0, 60)).toBe(10);
    expect(runProgress(blocks, 1, 360)).toBe(20);
    expect(runProgress(blocks, 1, 180)).toBe(50);
    expect(runProgress(blocks, 2, 0)).toBe(99);
    expect(runProgress([], 0, 0)).toBe(0);
  });
});

describe('retomar donde lo dejé', () => {
  const saved = { step_index: 1, step_block_id: 'b', step_remaining: 180, progress: 50, last_active_at: ago(60_000) };

  it('tras una pausa corta sigue en el mismo paso, unos segundos antes', () => {
    expect(resumePoint(blocks, saved, now)).toEqual({ index: 1, remaining: 185, restartedStep: false, progress: 49 });
  });

  it('tras una pausa larga repite el paso completo', () => {
    expect(resumePoint(blocks, { ...saved, last_active_at: ago(3 * 3_600_000) }, now)).toMatchObject({ index: 1, remaining: 360, restartedStep: true, progress: 20 });
  });

  it('encuentra el paso por su id si se movió y descarta si ya no existe', () => {
    const moved = [blocks[1]!, blocks[0]!, blocks[2]!];
    expect(resumePoint(moved, saved, now)?.index).toBe(0);
    expect(resumePoint(blocks, { ...saved, step_block_id: 'zzz' }, now)).toBeNull();
  });

  it('no ofrece retomar si es muy antiguo, sin avance o sin datos', () => {
    expect(resumePoint(blocks, { ...saved, last_active_at: ago(RESUME_WINDOW_MS + 1) }, now)).toBeNull();
    expect(resumePoint(blocks, { step_index: 0, step_block_id: 'a', step_remaining: 120, progress: 0, last_active_at: ago(1000) }, now)).toBeNull();
    expect(resumePoint(blocks, { step_index: null, step_block_id: null, step_remaining: null, progress: null, last_active_at: null }, now)).toBeNull();
  });
});

describe('cuándo lo dejó', () => {
  it('habla como persona', () => {
    expect(leftAgo(ago(20_000), now)).toBe('hace un momento');
    expect(leftAgo(ago(5 * 60_000), now)).toBe('hace 5 min');
    expect(leftAgo(ago(2 * 3_600_000), now)).toBe('hace 2 h');
    expect(leftAgo(ago(26 * 3_600_000), now)).toBe('ayer');
    expect(leftAgo(ago(3 * 86_400_000), now)).toBe('hace 3 días');
  });
});
