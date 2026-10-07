import { describe, it, expect } from 'vitest';
import { parseBlocks, defaultBlock, ACTION_TYPES, type ActionBlock } from '@/config/actions';
import { OFFICIAL_MOMENTS, officialMoment } from '@/config/official-moments';
import { flattenBlocks, totalMinutes, type MomentRef } from '@/lib/moments/flatten';
import { improveByRules } from '@/lib/moments/improve-rules';
import { pomodoroPhase } from '@/components/moments/block-runners-v2';
import { blocksForDay, challengeLength, challengeState } from '@/lib/moments/challenge';

const b = (id: string, type: ActionBlock['type'], minutes: number, config: Record<string, unknown> = {}): ActionBlock => ({ id, type, title: id, minutes, config });

describe('catálogo de acciones', () => {
  it('cada tipo tiene un bloque por defecto válido (salvo documento, libro e imagen, que se eligen o suben)', () => {
    expect(parseBlocks([defaultBlock('document')]).errors).toHaveLength(1);
    expect(parseBlocks([defaultBlock('image')]).errors).toHaveLength(1);
    expect(parseBlocks([defaultBlock('book')]).errors).toHaveLength(1);
    expect(defaultBlock('book').config.title).toBe('');
    for (const t of ACTION_TYPES.filter((x) => x !== 'document' && x !== 'book' && x !== 'image')) {
      const { blocks, errors } = parseBlocks([defaultBlock(t)]);
      expect(errors, t).toEqual([]);
      expect(blocks[0]!.type).toBe(t);
    }
  });
  it('rechaza config inválida y tipos desconocidos', () => {
    const { blocks, errors } = parseBlocks([
      { id: 'a', type: 'checklist', title: 'Lista', minutes: 2, config: { items: [] } },
      { id: 'b', type: 'telepatia', title: 'X', minutes: 2, config: {} },
      { id: 'c', type: 'writing', title: 'Escribe', minutes: 3, config: { prompt: '¿Qué sientes?' } },
    ]);
    expect(blocks.map((x) => x.id)).toEqual(['c']);
    expect(errors).toHaveLength(2);
  });
  it('aplica valores por defecto (respiración 4/6)', () => {
    const { blocks } = parseBlocks([{ id: 'r', type: 'breathing', title: 'Respira', minutes: 2, config: {} }]);
    expect(blocks[0]!.config).toEqual({ inhale: 4, hold: 0, exhale: 6, holdOut: 0 });
  });
});

describe('Moments oficiales', () => {
  it('son las 5 rutinas, cada bloque cita su fuente y todos los bloques son válidos', () => {
    expect(OFFICIAL_MOMENTS).toHaveLength(5);
    for (const m of OFFICIAL_MOMENTS) {
      expect(m.author).toBeTruthy();
      expect(m.blocks.every((x) => x.source?.includes(m.author!))).toBe(true);
      expect(parseBlocks(m.blocks).errors, m.slug!).toEqual([]);
    }
  });
  it('el ritual de Brian Tracy conserva sus pasos de segundos y su afirmación', () => {
    const bt = officialMoment('brian_tracy_5min')!;
    expect(bt.blocks.find((x) => x.id === 'say')).toMatchObject({ type: 'affirmation', seconds: 15 });
    expect(totalMinutes(bt.blocks)).toBe(5);
  });
});

describe('flattenBlocks (composición)', () => {
  const store: Record<string, ActionBlock[]> = {
    'slug:brian': [b('w', 'writing', 3, { prompt: 'x' }), b('a', 'affirmation', 1, { text: 'y' })],
    'slug:gratitud': [b('g', 'gratitude', 3, { count: 3 })],
    'slug:combo': [b('m1', 'moment', 0, { slug: 'brian' }), b('m2', 'moment', 0, { slug: 'gratitud' })],
    'slug:loop': [b('l', 'moment', 0, { slug: 'loop' }), b('t', 'timer', 2, { instruction: 'z' })],
  };
  const resolve = async (r: MomentRef) => store[r.momentId ? `id:${r.momentId}` : `slug:${r.slug}`] ?? null;

  it('expande Moments anidados y prefija ids', async () => {
    const out = await flattenBlocks([b('c', 'moment', 0, { slug: 'combo' })], resolve);
    expect(out.map((x) => x.id)).toEqual(['c.m1.w', 'c.m1.a', 'c.m2.g']);
  });
  it('corta ciclos y profundidad > 2', async () => {
    const out = await flattenBlocks(store['slug:loop']!, resolve, { self: { slug: 'loop' } });
    expect(out.map((x) => x.id)).toEqual(['t']);
    const deep = await flattenBlocks([b('d', 'moment', 0, { slug: 'combo' })], resolve, { depth: 1 });
    expect(deep).toEqual([]);
  });
  it('omite referencias que no existen', async () => {
    expect(await flattenBlocks([b('x', 'moment', 0, { slug: 'nada' }), b('t', 'timer', 2, { instruction: 'z' })], resolve)).toHaveLength(1);
  });
});

describe('improveByRules (mejor versión sin IA)', () => {
  const blocks = [b('a', 'writing', 5, { prompt: 'x' }), b('v', 'video', 12, { query: 'q' }), b('w', 'walk', 10)];
  it('quita lo saltado y acorta si no ayudó', () => {
    const r = improveByRules(blocks, { skipped: ['v'], moodBefore: 3, moodAfter: 3, helped: false, learning: null });
    expect(r.blocks.map((x) => x.id)).toEqual(['a', 'w']);
    expect(r.blocks.find((x) => x.id === 'w')!.minutes).toBe(7);
    expect(r.note).toContain('Quité');
  });
  it('si funcionó, mantiene lo esencial', () => {
    const r = improveByRules(blocks, { skipped: [], moodBefore: 2, moodAfter: 4, helped: true, learning: 'Caminar' });
    expect(r.blocks).toEqual(blocks);
  });
  it('ajusta a los minutos disponibles', () => {
    const r = improveByRules(blocks, { skipped: [], moodBefore: null, moodAfter: null, helped: true, learning: null, availableMinutes: 14 });
    expect(r.blocks.reduce((a, x) => a + x.minutes, 0)).toBeLessThanOrEqual(15);
  });
});

describe('pomodoroPhase', () => {
  it('foco → descanso entre ciclos → foco → listo (sin descanso al final)', () => {
    expect(pomodoroPhase(0, 25, 5, 2)).toMatchObject({ phase: 'focus', cycle: 1, left: 1500 });
    expect(pomodoroPhase(1500, 25, 5, 2)).toMatchObject({ phase: 'rest', cycle: 1, left: 300 });
    expect(pomodoroPhase(1800, 25, 5, 2)).toMatchObject({ phase: 'focus', cycle: 2 });
    expect(pomodoroPhase(3300, 25, 5, 2)).toMatchObject({ phase: 'done' });
  });
});

describe('retos de varios días', () => {
  const blocks = [
    { id: 'r', type: 'breathing', title: 'Respira', minutes: 1, config: {} },
    { id: 'd1', type: 'writing', title: 'Día 1', minutes: 3, config: { prompt: 'x' }, day: 1 },
    { id: 'd2', type: 'writing', title: 'Día 2', minutes: 3, config: { prompt: 'y' }, day: 2 },
  ] as ActionBlock[];
  it('los bloques sin día se repiten; los demás pertenecen a su día', () => {
    expect(blocksForDay(blocks, 1).map((x) => x.id)).toEqual(['r', 'd1']);
    expect(blocksForDay(blocks, 2).map((x) => x.id)).toEqual(['r', 'd2']);
    expect(challengeLength(blocks, 7)).toBe(7);
    expect(challengeLength(blocks, 1)).toBe(2);
  });
  it('avanza un día por día de calendario y no castiga los días sin practicar', () => {
    expect(challengeState({}, 3, '2026-10-05')).toMatchObject({ currentDay: 1, availableToday: true });
    expect(challengeState({ 1: '2026-10-05' }, 3, '2026-10-05')).toMatchObject({ currentDay: 2, doneToday: true, availableToday: false });
    expect(challengeState({ 1: '2026-10-01' }, 3, '2026-10-05')).toMatchObject({ currentDay: 2, availableToday: true });
    expect(challengeState({ 1: 'a', 2: 'b', 3: 'c' }, 3, '2026-10-05')).toMatchObject({ finished: true, currentDay: null });
  });
});
