import { describe, it, expect } from 'vitest';
import { thinkingPhrases, PHRASES, TOOL_STATUS } from '@/lib/thinking-phrases';
import { buildSystemPrompt } from '@/lib/ai/prompts';

describe('frases mientras SOI piensa', () => {
  it('primero dice qué hace; después frases del contexto de lo que escribió', () => {
    const p = thinkingPhrases('Tengo mucha ansiedad por la entrevista', undefined, 10);
    expect(p[0]).toBe('Leyendo lo que me contaste…');
    expect(PHRASES.ansiedad).toContain(p[1]);
  });
  it('usa el agente y la hora cuando el texto no da pistas', () => {
    expect(PHRASES.calma).toContain(thinkingPhrases('hola', 'meditacion', 15)[1]);
    expect(thinkingPhrases('hola', undefined, 7)).toEqual(expect.arrayContaining([...PHRASES.manana]));
    expect(thinkingPhrases('hola', undefined, 22)).toEqual(expect.arrayContaining([...PHRASES.noche]));
  });
  it('no repite frases y las herramientas dicen qué hacen', () => {
    const p = thinkingPhrases('quiero ganar dinero y no sé por dónde empezar, lo dejo para mañana', 'napoleon_hill', 9);
    expect(new Set(p).size).toBe(p.length);
    expect(TOOL_STATUS.createMoment).toBe('Diseñando tu Moment…');
  });
});

describe('prompt amigable con la caché del proveedor', () => {
  it('lo fijo del agente va antes que el perfil y la memoria', () => {
    const p = buildSystemPrompt('brian_tracy', { profile: { display_name: 'Ana', goals: ['x'] } as never, memories: [{ title: 'm', content: 'recuerdo', category: 'pensamiento' }] });
    expect(p.indexOf('ENEMIGOS INTERIORES')).toBeLessThan(p.indexOf('recuerdo'));
    expect(p.indexOf('HERRAMIENTAS')).toBeLessThan(p.indexOf('recuerdo'));
  });
});
