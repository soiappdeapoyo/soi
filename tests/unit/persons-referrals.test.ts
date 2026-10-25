import { describe, it, expect } from 'vitest';
import { checkDescription, rewritable, rewriteByRules } from '@/lib/persons/spec';
import { PERSONS_TRIAL_DAYS, REFERRAL_CODE_RE, REFERRAL_MAX_REWARDED, referralReward } from '@/lib/persons/entitlements';

describe('descripciones que no pasan: se reescriben', () => {
  it('una persona real se vuelve arquetipo y pasa las reglas', () => {
    const t = rewriteByRules('Quiero practicar con mi ex, que es diseñadora en Monterrey, celosa y muy directa');
    expect(checkDescription(t)).toBeNull();
    expect(t).toMatch(/disenadora|diseñadora/);
    expect(t).not.toMatch(/mi ex/);
  });

  it('un menor se vuelve adulto y lo demás se queda', () => {
    const t = rewriteByRules('Chica de 16 años que estudia música y es tímida pero graciosa');
    expect(checkDescription(t)).toBeNull();
    expect(t).toMatch(/19/);
    expect(t).toMatch(/musica|música/);
  });

  it('lo sexual se quita y queda su personalidad', () => {
    const t = rewriteByRules('Una mujer sumisa y sexy de 30, enfermera, le gusta el cine y es muy cariñosa');
    expect(checkDescription(t)).toBeNull();
    expect(t).toMatch(/enfermera/);
  });

  it('menor y sexual juntos nunca se reescriben', () => {
    expect(rewritable('chica de 16 años sexy')).toBe(false);
    expect(rewritable('chica de 16 años que estudia')).toBe(true);
  });
});

describe('prueba e invitaciones', () => {
  it('la prueba dura 3 días; la primera invitación vale 7 y las siguientes 2, con tope', () => {
    expect(PERSONS_TRIAL_DAYS).toBe(3);
    expect(referralReward(0)).toBe(7);
    expect(referralReward(1)).toBe(2);
    expect(referralReward(5)).toBe(2);
    expect(referralReward(REFERRAL_MAX_REWARDED)).toBe(0);
  });

  it('solo acepta códigos con la forma esperada', () => {
    expect(REFERRAL_CODE_RE.test('abcd2345')).toBe(true);
    expect(REFERRAL_CODE_RE.test('abc')).toBe(false);
    expect(REFERRAL_CODE_RE.test("x' or 1=1")).toBe(false);
  });
});
