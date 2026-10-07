import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/moments/auto-cover', () => ({ scheduleAutoCover: () => {} }));
import { proposalMode, PROPOSAL_TOOLS } from '@/lib/ai/proposal-gate';
import { buildTools } from '@/lib/ai/tools';
import { buildOpener } from '@/lib/opener';

describe('escuchar primero, proponer después', () => {
  it('primer mensaje sin pedido: escucha; después: puede pedir permiso', () => {
    expect(proposalMode({ text: 'Hoy me siento rara, no sé', userTurns: 1, anxiety: false })).toBe('listen');
    expect(proposalMode({ text: 'Creo que es por el trabajo', userTurns: 2, anxiety: false })).toBe('invite');
  });
  it('si lo pide o acepta la invitación, propone', () => {
    expect(proposalMode({ text: 'Proponme algo para ahora.', userTurns: 1, anxiety: false })).toBe('propose');
    expect(proposalMode({ text: '¿Qué hago con esto?', userTurns: 1, anxiety: false })).toBe('propose');
    expect(proposalMode({ text: 'Sí, dale', userTurns: 3, previousAssistant: 'Te entiendo. ¿Te propongo algo de 3 minutos para esto?', anxiety: false })).toBe('propose');
    expect(proposalMode({ text: 'Sí, así es', userTurns: 3, previousAssistant: '¿Desde cuándo te pasa?', anxiety: false })).toBe('invite');
    expect(proposalMode({ text: 'Mi reflexión de «Charla»: quiero empezar', userTurns: 1, anxiety: false })).toBe('propose');
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

describe('saludo sin imponer', () => {
  it('sin señal fuerte: sin tarjeta ni ritual, con "Proponme algo" a un toque', () => {
    const o = buildOpener({ name: 'Ana', hour: 8, today: '2026-10-06', onboardingCompleted: true, lastRitualDate: null, ritualAvailable: true, weakestLink: null, lastConversationTitle: null, proposal: null });
    expect(o.proposal).toBeNull();
    expect(o.practice).toBeNull();
    expect(o.text).not.toMatch(/te propongo/);
    expect(o.replies.length).toBeLessThanOrEqual(3);
    expect(o.links.map((r) => r.label)).toEqual(['Proponme algo', 'Mi ritual de hoy']);
  });
});
