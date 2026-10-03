import { describe, it, expect } from 'vitest';
import { buildOpener, greetingForHour, type OpenerInput } from '@/lib/opener';

const base: OpenerInput = {
  name: 'Ana López', hour: 9, today: '2026-10-03', onboardingCompleted: true,
  lastRitualDate: '2026-10-02', ritualAvailable: true, weakestLink: 'accion', lastConversationTitle: null,
};

describe('buildOpener', () => {
  it('saluda por hora y con el primer nombre', () => {
    expect(greetingForHour(7)).toBe('Buenos días');
    expect(greetingForHour(15)).toBe('Buenas tardes');
    expect(greetingForHour(23)).toBe('Buenas noches');
    expect(buildOpener(base).text.startsWith('Buenos días, Ana.')).toBe(true);
  });

  it('persona nueva: se presenta sin formulario', () => {
    const o = buildOpener({ ...base, onboardingCompleted: false });
    expect(o.text).toContain('Soy SOI');
    expect(o.practice).toBeNull();
  });

  it('ofrece el ritual por la mañana si no lo hizo', () => {
    expect(buildOpener(base).practice?.href).toBe('/ritual');
  });

  it('no ofrece el ritual si está bloqueado (Free)', () => {
    expect(buildOpener({ ...base, ritualAvailable: false }).practice).toBeNull();
  });

  it('racha sin castigo tras 2+ días', () => {
    expect(buildOpener({ ...base, lastRitualDate: '2026-09-30' }).text).toContain('Ayer no te vimos, pero aquí seguimos');
  });

  it('retoma la última conversación', () => {
    const o = buildOpener({ ...base, hour: 16, lastRitualDate: '2026-10-03', lastConversationTitle: 'mi miedo a hablar en público' });
    expect(o.text).toContain('«mi miedo a hablar en público»');
  });

  it('agente elegido en el sidebar tiene su propio saludo', () => {
    expect(buildOpener({ ...base, agent: 'meditacion' }).text).toContain('pausa');
  });
});
