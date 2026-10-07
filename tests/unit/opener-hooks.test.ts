import { describe, it, expect } from 'vitest';
import { pickHook, templateFor, repliesFor, validOpener, type Hook } from '@/lib/opener-hooks';

const h = (kind: Hook['kind'], key: string, weight: number, facts: Record<string, string> = {}): Hook => ({ kind, key, weight, timeBound: false, facts });
const hooks = [
  h('thread', 'thread:c1', 100, { when: 'ayer', quote: 'El trabajo me tiene sin dormir' }),
  h('reflection', 'reflection:r1', 72, { when: 'el jueves', quote: 'Escribir me ordenó la cabeza' }),
  h('goal', 'goal:abrir', 50, { goal: 'Abrir mi propio estudio' }),
  h('checkin', 'checkin', 1),
];

describe('ganchos del saludo', () => {
  it('elige lo más relevante y no repite los últimos', () => {
    expect(pickHook(hooks, []).key).toBe('thread:c1');
    expect(pickHook(hooks, ['thread:c1']).key).toBe('reflection:r1');
    expect(pickHook(hooks, ['reflection:r1', 'thread:c1']).key).toBe('goal:abrir');
    expect(pickHook(hooks, ['goal:abrir', 'reflection:r1', 'thread:c1']).key).toBe('checkin');
  });
  it('cada gancho tiene su propia frase (con sus palabras) y sus respuestas', () => {
    expect(templateFor(hooks[1]!)).toBe('El jueves escribiste: «Escribir me ordenó la cabeza». ¿Sigue siendo así?');
    expect(templateFor(hooks[2]!)).toContain('«Abrir mi propio estudio»');
    expect(repliesFor(hooks[2]!).map((r) => r.label)).toEqual(['Avancé', 'Me trabé', 'Hoy otra cosa']);
    const texts = new Set(hooks.map(templateFor));
    expect(texts.size).toBe(hooks.length);
  });
  it('valida lo que escribe la IA: una pregunta, sin cifras, sin saludo propio, sin repetirse', () => {
    expect(validOpener('El jueves escribiste que escribir te ordenó la cabeza. ¿Te sigue sirviendo?', [])).toBe(true);
    expect(validOpener('Buenas tardes, Ana. ¿Cómo estás?', [])).toBe(false);
    expect(validOpener('Llevas 3 días seguidos. ¿Cómo vas?', [])).toBe(false);
    expect(validOpener('¿Cómo vas? ¿Y tu meta?', [])).toBe(false);
    expect(validOpener('Me quedé pensando en tu meta. ¿Cómo va eso?', ['Me quedé pensando en tu meta. ¿Cómo va eso?'])).toBe(false);
  });
});

describe('fechas en el saludo', () => {
  it('los días de la semana llevan artículo', async () => {
    const { whenPhrase } = await import('@/lib/opener-hooks');
    expect(whenPhrase('domingo')).toBe('el domingo');
    expect(whenPhrase('ayer')).toBe('ayer');
    expect(whenPhrase('hace un rato')).toBe('hace un rato');
  });
});
