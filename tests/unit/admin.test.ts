import { describe, it, expect } from 'vitest';
import { isAdminEmail } from '@/lib/admin/auth';
import { mergeSettings, DEFAULT_SETTINGS, SettingsSchema } from '@/lib/settings';

describe('acceso al panel', () => {
  it('solo los correos de ADMIN_EMAILS (sin importar mayúsculas ni espacios)', () => {
    expect(isAdminEmail('Dueno@Ejemplo.com', ' dueno@ejemplo.com , otra@ejemplo.com')).toBe(true);
    expect(isAdminEmail('alguien@ejemplo.com', 'dueno@ejemplo.com')).toBe(false);
    expect(isAdminEmail('dueno@ejemplo.com', '')).toBe(false);
    expect(isAdminEmail(null, 'dueno@ejemplo.com')).toBe(false);
  });
});

describe('ajustes', () => {
  it('lo guardado se une a los valores por defecto; lo inválido se ignora campo a campo', () => {
    const s = mergeSettings([
      { key: 'trial_days', value: 14 },
      { key: 'free_query_limit', value: -5 },
      { key: 'plans', value: { monthly: { price: 6.99, stripePriceId: 'price_ABC123' }, yearly: { price: 39.99, stripePriceId: null } } },
    ]);
    expect(s.trialDays).toBe(14);
    expect(s.freeQueryLimit).toBe(DEFAULT_SETTINGS.freeQueryLimit);
    expect(s.plans.monthly).toEqual({ price: 6.99, stripePriceId: 'price_ABC123' });
  });
  it('rangos seguros: un error de tipeo no se guarda', () => {
    expect(SettingsSchema.partial().safeParse({ trialDays: 500 }).success).toBe(false);
    expect(SettingsSchema.partial().safeParse({ plans: { monthly: { price: 5, stripePriceId: 'no-es-un-id' }, yearly: { price: 30, stripePriceId: null } } }).success).toBe(false);
    expect(SettingsSchema.partial().safeParse({ ttsDailyMinutes: 30 }).success).toBe(true);
  });
});
