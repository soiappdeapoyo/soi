import { describe, it, expect, vi } from 'vitest';
import { AGENTS, PRACTICE_AGENTS } from '@/config/agents';
import { RouterSchema } from '@/lib/ai/router';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { CLEAR_LAWS, clearPrompt } from '@/lib/ai/prompts/james-clear';
import { applyHabitPatch, MAX_HABITS } from '@/lib/ai/habit-memory';
import { HABIT_MAX_MINUTES, polishMoment, voteMessage } from '@/lib/moments/polish';
import { placeInDay } from '@/lib/day-plan';
import { thinkingPhrases } from '@/lib/thinking-phrases';
import type { ActionBlock } from '@/config/actions';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));

const block = (type: string, minutes: number, id = type) => ({ id, type, title: type, minutes, config: {} }) as unknown as ActionBlock;

describe('James Clear (agente de hábitos)', () => {
  it('es agente, está en el sidebar y el router puede elegirlo', () => {
    expect(AGENTS.james_clear.label).toBe('James Clear');
    expect(AGENTS.james_clear.eslabon).toBe('accion');
    expect(PRACTICE_AGENTS).toContain('james_clear');
    expect(RouterSchema.shape.agent.options).toContain('james_clear');
  });

  it('las 4 leyes con su inversión, y la memoria de hábitos en el prompt', () => {
    expect(CLEAR_LAWS.map((l) => l.id)).toEqual(['obvio', 'atractivo', 'facil', 'satisfactorio']);
    expect(CLEAR_LAWS.every((l) => l.inverse && l.techniques.length && l.ask && l.block)).toBe(true);
    const p = clearPrompt({ habits: [{ name: 'Leer antes de dormir', mode: 'build', identity: 'Soy lectora', tiny: 'Una página', cue: 'Después de lavarme los dientes', time: '22:30', status: 'active', weak_law: 'obvio' }] });
    expect(p).toContain('«Leer antes de dormir»');
    expect(p).toContain('2 min: Una página');
    expect(p).toContain('a las 22:30');
    expect(p).toContain('DIAGNOSTICA');
    expect(clearPrompt(null)).toContain('Empieza por la identidad');
  });

  it('lo que ya le sale solo no ocupa el prompt', () => {
    expect(clearPrompt({ habits: [{ name: 'Tomar agua', mode: 'build', status: 'automatic' }] })).toContain('aún no diseñó');
  });

  it('el pack solo viaja cuando habla James Clear (ahorro de tokens)', () => {
    expect(buildSystemPrompt('james_clear', {})).toContain('LAS 4 LEYES');
    expect(buildSystemPrompt('rutinas', {})).not.toContain('LAS 4 LEYES');
    expect(buildSystemPrompt('james_clear', {}).length - buildSystemPrompt('brian_tracy', {}).length).toBeLessThan(5000);
  });

  it('mientras piensa, frases de hábito', () => {
    expect(thinkingPhrases('empiezo a correr y a las dos semanas lo dejo', 'james_clear', 15).join(' ')).toMatch(/dos minutos|voto|Fallar un día/);
  });
});

describe('memoria de hábitos', () => {
  const now = '2026-10-17T12:00:00.000Z';
  it('mismo nombre (sin importar mayúsculas ni acentos) → actualiza; nuevo → al inicio', () => {
    let list = applyHabitPatch([], { name: 'Meditar', tiny: 'Una respiración' }, now);
    expect(list).toEqual([{ name: 'Meditar', tiny: 'Una respiración', mode: 'build', status: 'active', updated_at: now }]);
    list = applyHabitPatch(list, { name: 'meditár', time: '07:00', tiny: '' }, now);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ name: 'meditár', tiny: 'Una respiración', time: '07:00' });
    list = applyHabitPatch(list, { name: 'Dejar el celular en la noche', mode: 'break' }, now);
    expect(list.map((h) => h.name)).toEqual(['Dejar el celular en la noche', 'meditár']);
  });

  it('no acumula más de MAX_HABITS sin terminar; los automáticos se conservan', () => {
    let list = applyHabitPatch([], { name: 'Ya automático', status: 'automatic' }, now);
    for (let i = 0; i < MAX_HABITS + 3; i++) list = applyHabitPatch(list, { name: `Hábito ${i}` }, now);
    expect(list.filter((h) => h.status !== 'automatic')).toHaveLength(MAX_HABITS);
    expect(list.some((h) => h.name === 'Ya automático')).toBe(true);
    expect(list[0]!.name).toBe(`Hábito ${MAX_HABITS + 2}`);
  });
});

describe('Moment de un hábito', () => {
  it('cierra con un voto por su identidad', () => {
    const { blocks, notes } = polishMoment([block('timer', 2), block('next_step', 1)], { habit: { identity: 'Soy alguien que lee cada noche' } });
    expect(notes).toContain('appended_vote');
    expect(blocks.at(-1)).toMatchObject({ type: 'celebration', config: { message: 'Un voto más por ser alguien que lee cada noche.' } });
  });

  it('si ya cierra con celebración, no agrega otra', () => {
    const { blocks } = polishMoment([block('timer', 2), block('celebration', 1)], { habit: {} });
    expect(blocks.filter((b) => b.type === 'celebration')).toHaveLength(1);
  });

  it('hazlo fácil: sin tiempo dicho no pasa de HABIT_MAX_MINUTES; con tiempo dicho, manda la persona', () => {
    const long = [block('breathing', 3), block('reading', 10, 'r'), block('reflection', 4)];
    const easy = polishMoment(long, { habit: { identity: 'lectora' } }).blocks;
    expect(easy.reduce((a, b) => a + b.minutes, 0)).toBeLessThanOrEqual(HABIT_MAX_MINUTES + easy.length);
    expect(polishMoment(long, { habit: {}, minutes: 20 }).blocks.find((b) => b.id === 'r')?.minutes).toBe(10);
    // Sin hábito, nada cambia en el tiempo.
    expect(polishMoment(long).blocks.find((b) => b.id === 'r')?.minutes).toBe(10);
  });

  it('el mensaje del voto se lee natural', () => {
    expect(voteMessage('soy una persona que se mueve')).toBe('Un voto más por ser una persona que se mueve.');
    expect(voteMessage('Yo soy alguien que escribe.')).toBe('Un voto más por ser alguien que escribe.');
    expect(voteMessage('medita cada mañana')).toBe('Un voto más por ser alguien que medita cada mañana.');
    expect(voteMessage(null)).toBe('Un voto más por la persona que estás eligiendo ser.');
  });
});

describe('Mi día: un hábito vive ahí', () => {
  const ref = 'm:11111111-1111-1111-1111-111111111111';
  it('agrega al final con su hora (alarma diaria) o solo cambia la hora si ya estaba', () => {
    const added = placeInDay([{ id: 'a', ref: 's:cierre_del_dia' }], ref, '07:00', 'h1');
    expect(added).toEqual([{ id: 'a', ref: 's:cierre_del_dia' }, { id: 'h1', ref, time: '07:00' }]);
    expect(placeInDay(added, ref, '06:30', 'h2')).toEqual([{ id: 'a', ref: 's:cierre_del_dia' }, { id: 'h1', ref, time: '06:30' }]);
    expect(placeInDay(added, ref, undefined, 'h3')).toEqual(added);
  });
  it('respeta el máximo de 20', () => {
    const full = Array.from({ length: 20 }, (_, i) => ({ id: `x${i}`, ref: `s:slug_${i}` }));
    expect(placeInDay(full, ref, '07:00', 'h')).toHaveLength(20);
  });
});
