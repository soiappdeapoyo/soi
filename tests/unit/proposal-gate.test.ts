import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/moments/auto-cover', () => ({ scheduleAutoCover: () => {} }));
import { proposalMode, PROPOSAL_TOOLS, understood } from '@/lib/ai/proposal-gate';
import { buildTools } from '@/lib/ai/tools';
import { buildOpener } from '@/lib/opener';

describe('escuchar primero, proponer después', () => {
  it('primer mensaje sin pedido: escucha; después: puede pedir permiso', () => {
    expect(proposalMode({ text: 'Hoy me siento rara, no sé', userTurns: 1, anxiety: false })).toBe('listen');
    expect(proposalMode({ text: 'Creo que es por el trabajo', userTurns: 2, anxiety: false })).toBe('invite');
  });
  it('si lo pide sin que SOI lo conozca aún: primero entender (explore), no algo genérico', () => {
    expect(proposalMode({ text: 'Proponme algo para ahora.', userTurns: 1, anxiety: false })).toBe('explore');
    expect(proposalMode({ text: '¿Qué hago con esto?', userTurns: 1, anxiety: false })).toBe('explore');
  });
  it('con entendimiento (o si insiste en algo rápido), propone', () => {
    const userTexts = [
      'El trabajo me tiene sin dormir desde el lunes, mi jefe me cambió todo el proyecto',
      'Siento el pecho apretado y la cabeza no para de dar vueltas antes de dormir',
      'Sí, dale',
    ];
    expect(proposalMode({ text: 'Sí, dale', userTurns: 3, previousAssistant: 'Por lo que me cuentas… ¿Te preparo algo pensado para eso?', anxiety: false, userTexts })).toBe('propose');
    expect(proposalMode({ text: 'Proponme algo rápido, sin preguntas', userTurns: 1, anxiety: false })).toBe('propose');
    expect(proposalMode({ text: 'Mi reflexión de «Charla»: quiero empezar', userTurns: 1, anxiety: false })).toBe('propose');
  });
  it('si ya hablaron del tema antes, basta con menos para entender', () => {
    expect(understood(['Sigue igual, otra vez no pude dormir por el trabajo'], true)).toBe(true);
    expect(understood(['Sigue igual, otra vez no pude dormir por el trabajo'], false)).toBe(false);
    expect(understood(['Hoy llego con algo de carga.', 'Proponme algo para ahora.'], true)).toBe(false);
  });
  it('un sí que no responde a una invitación no cuenta como pedido', () => {
    expect(proposalMode({ text: 'Sí, así es', userTurns: 3, previousAssistant: '¿Desde cuándo te pasa?', anxiety: false })).toBe('invite');
  });
  it('con ansiedad, una oferta mínima de inmediato', () => {
    expect(proposalMode({ text: 'Estoy con mucha ansiedad', userTurns: 1, anxiety: true })).toBe('soothe');
  });
  it('sin permiso, la IA no tiene herramientas para proponer (y gasta menos tokens)', () => {
    const base = { supabase: {} as never, userId: 'u', access: { youtube: true, evidence: true } };
    const keys = Object.keys(buildTools({ ...base, proposals: false }));
    for (const t of PROPOSAL_TOOLS) expect(keys).not.toContain(t);
    expect(keys).toContain('updateProfile');
    expect(Object.keys(buildTools({ ...base, proposals: true }))).toContain('createMoment');
  });
});

describe('conversar o accionar', () => {
  const action = ['Quiero empezar a correr por las mañanas pero siempre lo dejo para mañana', 'Me cuesta arrancar, me quedo en la cama viendo el teléfono media hora'];
  it('si eligió solo conversar, no se le propone nada (hasta que lo pida)', () => {
    expect(proposalMode({ text: 'Hoy solo quiero conversar.', userTurns: 1, anxiety: false })).toBe('talk');
    expect(proposalMode({ text: 'Estoy cansada de todo esto', userTurns: 3, anxiety: false, userTexts: ['Hoy solo quiero conversar.', ...action, 'Estoy cansada de todo esto'] })).toBe('talk');
    expect(proposalMode({ text: 'Bueno, proponme algo rápido', userTurns: 4, anxiety: false, userTexts: ['Hoy solo quiero conversar.', ...action, 'Bueno, proponme algo rápido'] })).toBe('propose');
  });
  it('tema de acción ya entendido: pide permiso explícito; si la conversación se alarga, lo prepara', () => {
    expect(proposalMode({ text: action[1]!, userTurns: 2, anxiety: false, userTexts: action })).toBe('offer');
    expect(proposalMode({ text: 'Así es', userTurns: 4, anxiety: false, userTexts: [...action, 'Sí, eso me pasa siempre', 'Así es'] })).toBe('prepare');
    expect(proposalMode({ text: 'Así es', userTurns: 4, anxiety: false, userTexts: [...action, 'Así es'], alreadyProposed: true })).toBe('invite');
  });
  it('reconoce más formas de invitar y de aceptar', () => {
    for (const prev of ['¿Diseñamos algo para esto?', '¿Quieres que te prepare un Moment?', '¿Armamos un plan corto?', '¿Te parece que preparemos algo?']) {
      expect(proposalMode({ text: 'Me encantaría', userTurns: 3, previousAssistant: prev, anxiety: false, userTexts: [...action, 'Me encantaría'] })).toBe('propose');
    }
    expect(proposalMode({ text: 'Sí, por favor', userTurns: 3, previousAssistant: '¿Te preparo algo?', anxiety: false, userTexts: [...action, 'Sí, por favor'] })).toBe('propose');
  });
});

describe('saludo sin imponer', () => {
  it('sin señal fuerte: sin tarjeta ni ritual, con "Proponme algo" a un toque', () => {
    const o = buildOpener({ name: 'Ana', hour: 8, today: '2026-10-06', onboardingCompleted: true, lastRitualDate: null, ritualAvailable: true, weakestLink: null, lastConversationTitle: null, proposal: null });
    expect(o.proposal).toBeNull();
    expect(o.practice).toBeNull();
    expect(o.text).not.toMatch(/te propongo/);
    expect(o.replies.length).toBeLessThanOrEqual(3);
    expect(o.links.map((r) => r.label)).toEqual(['Proponme algo', 'Solo quiero conversar', 'Mi ritual de hoy']);
  });
});

describe('primera sesión: vía rápida al primer Moment', () => {
  const said = 'Tengo una presentación mañana y no puedo dejar de pensar en eso';
  it('con un mensaje concreto ofrece algo de 3 minutos (sin herramientas todavía)', () => {
    expect(proposalMode({ text: said, userTurns: 1, anxiety: false, userTexts: [said], firstSession: true })).toBe('first_offer');
    expect(proposalMode({ text: said, userTurns: 1, anxiety: false, userTexts: [said] })).toBe('listen');
  });
  it('al aceptar, diseña de inmediato', () => {
    expect(proposalMode({ text: 'Sí, dale', userTurns: 2, anxiety: false, previousAssistant: 'Por lo que me cuentas… ¿Te preparo algo de 3 minutos para esto, ahora?', userTexts: [said, 'Sí, dale'], firstSession: true })).toBe('propose');
  });
  it('respeta conversar, la ansiedad, un saludo vacío y no insiste', () => {
    expect(proposalMode({ text: 'Solo quiero hablar', userTurns: 1, anxiety: false, userTexts: ['Solo quiero hablar'], firstSession: true })).toBe('talk');
    expect(proposalMode({ text: said, userTurns: 1, anxiety: true, userTexts: [said], firstSession: true })).toBe('soothe');
    expect(proposalMode({ text: 'Hola', userTurns: 1, anxiety: false, userTexts: ['Hola'], firstSession: true })).toBe('listen');
    expect(proposalMode({ text: said, userTurns: 3, anxiety: false, userTexts: [said], firstSession: true, alreadyProposed: true })).not.toBe('first_offer');
  });
});
