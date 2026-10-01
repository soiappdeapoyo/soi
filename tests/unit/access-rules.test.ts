import { describe, it, expect } from 'vitest';
import { evaluateAccess, effectivePlan, type AccessProfile } from '@/lib/billing/access-rules';

const now = new Date('2026-10-01T12:00:00Z');
const future = '2026-10-05T00:00:00Z';
const past = '2026-09-20T00:00:00Z';
const base: AccessProfile = { plan: 'trial', trial_ends_at: future, free_queries_remaining: 20, is_paywalled: false };

describe('evaluateAccess', () => {
  it('trial activo: todo permitido', () => {
    expect(evaluateAccess(base, 'community', now).allowed).toBe(true);
    expect(evaluateAccess(base, 'tts', now).allowed).toBe(true);
  });

  it('trial vencido sin cron = Free', () => {
    const p = { ...base, trial_ends_at: past };
    expect(effectivePlan(p, now)).toBe('free');
    expect(evaluateAccess(p, 'chat', now).allowed).toBe(true);
    expect(evaluateAccess(p, 'routine_execution', now)).toEqual({ allowed: false, reason: 'trial_expired' });
  });

  it('free con consultas: solo chat', () => {
    const p: AccessProfile = { ...base, plan: 'free', free_queries_remaining: 3 };
    expect(evaluateAccess(p, 'chat', now).allowed).toBe(true);
    expect(evaluateAccess(p, 'evidence_save', now).allowed).toBe(false);
  });

  it('free sin consultas: chat bloqueado', () => {
    const p: AccessProfile = { ...base, plan: 'free', free_queries_remaining: 0, is_paywalled: true };
    expect(evaluateAccess(p, 'chat', now)).toEqual({ allowed: false, reason: 'queries_exhausted' });
    expect(evaluateAccess(p, 'community', now)).toEqual({ allowed: false, reason: 'paywalled' });
  });

  it('SOI+: todo permitido', () => {
    const p: AccessProfile = { ...base, plan: 'soi_plus', trial_ends_at: past, free_queries_remaining: 0 };
    expect(evaluateAccess(p, 'pdf_export', now).allowed).toBe(true);
  });

  it('sin perfil: bloqueado', () => {
    expect(evaluateAccess(null, 'chat', now).allowed).toBe(false);
  });
});
