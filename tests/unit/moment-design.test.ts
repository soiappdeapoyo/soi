import { describe, it, expect } from 'vitest';
import { polishMoment } from '@/lib/moments/polish';
import { breathPhase } from '@/components/moments/block-runners';
import { parseBlocks, defaultBlock, BREATH_PATTERNS } from '@/config/actions';
import { coverQueryByRules } from '@/lib/moments/auto-cover';
import type { ActionBlock } from '@/config/actions';

const b = (type: ActionBlock['type'], minutes: number, config: Record<string, unknown> = {}): ActionBlock => ({ id: `${type}${minutes}`, type, title: type, minutes, config } as ActionBlock);

describe('pulido del Moment', () => {
  it('con ansiedad empieza regulando; siempre cierra; respeta el tiempo que tiene', () => {
    const { blocks, notes } = polishMoment([b('writing', 6), b('reflection', 6)], { anxiety: true, minutes: 5 });
    expect(blocks[0]!.type).toBe('breathing');
    expect(blocks.at(-1)!.type).toBe('celebration');
    expect(notes).toEqual(['prepended_breathing', 'appended_celebration', 'scaled_minutes']);
    expect(blocks.reduce((a, x) => a + x.minutes, 0)).toBeLessThanOrEqual(7);
  });
  it('lo que ya está bien no se toca', () => {
    const ok = [b('breathing', 1), b('reframe', 4), b('next_step', 2)];
    expect(polishMoment(ok, { anxiety: true, minutes: 8 }).notes).toEqual([]);
  });
});

describe('respiración con patrones', () => {
  it('fases inhala → sostén → exhala → pausa (las de 0 s se saltan)', () => {
    const caja = BREATH_PATTERNS.caja.timing;
    expect([0, 4500, 8500, 12500].map((ms) => breathPhase(ms, caja).phase)).toEqual(['in', 'hold', 'out', 'rest']);
    expect([1000, 5000].map((ms) => breathPhase(ms, BREATH_PATTERNS.calma.timing).phase)).toEqual(['in', 'out']);
  });
  it('elegir un patrón fija sus tiempos', () => {
    const { blocks } = parseBlocks([{ id: 'x', type: 'breathing', title: 'Para dormir', minutes: 2, config: { pattern: '478' } }]);
    expect(blocks[0]!.config).toMatchObject({ inhale: 4, hold: 7, exhale: 8, holdOut: 0 });
  });
  it('las acciones nuevas tienen un bloque por defecto válido', () => {
    for (const t of ['reframe', 'body_scan', 'letter'] as const) expect(parseBlocks([defaultBlock(t)]).errors).toEqual([]);
  });
});

describe('portada según la hora y el tema', () => {
  const first = () => 0;
  it('de noche, escenas nocturnas para lo sereno; de mañana, luz de inicio', () => {
    expect(coverQueryByRules({ title: 'Soltar el día', kind: 'recovery', blocks: [{ type: 'breathing' }], part: 'noche' }, first)).toBe('night sky moon');
    expect(coverQueryByRules({ title: 'Arrancar con foco', kind: 'growth', blocks: [{ type: 'next_step' }], part: 'manana' }, first)).toBe('sunrise horizon');
  });
  it('el tema de la conversación también cuenta', () => {
    expect(coverQueryByRules({ title: 'Mi plan', kind: 'growth', blocks: [], context: 'Mi jefe me cambió el proyecto' }, first)).toBe('minimal desk plant');
  });
});
