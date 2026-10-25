import { describe, it, expect } from 'vitest';
import { cityCountry, localCity, NEUTRAL, regionFor, REGIONS } from '@/config/regionalisms';
import { ackMessage } from '@/lib/persons/scheduler';
import { ipCountry } from '@/lib/geo-country';

describe('regionalismos', () => {
  it('país por la IP (encabezado de Vercel), solo códigos válidos', () => {
    expect(ipCountry(new Headers({ 'x-vercel-ip-country': 'ar' }))).toBe('AR');
    expect(ipCountry(new Headers({ 'x-vercel-ip-country': 'XXX' }))).toBeNull();
    expect(ipCountry(new Headers())).toBeNull();
  });

  it('cada país tiene ciudades, expresiones y avisos; sin país, español neutro', () => {
    for (const r of Object.values(REGIONS)) {
      expect(r.cities.length).toBeGreaterThan(0);
      expect(r.slang.length).toBeGreaterThanOrEqual(5);
      expect(r.ack.warm.every((a) => a.includes('{a}') || !a.includes('{'))).toBe(true);
      expect(cityCountry(r.cities[0])).toBe(r.code);
    }
    expect(regionFor('BR')).toBe(NEUTRAL);
    expect(regionFor('ar').voseo).toBe(true);
    expect(regionFor('ES').notes).toMatch(/vosotros/);
  });

  it('reconoce ciudades con o sin acento y con país', () => {
    expect(cityCountry('Medellin')).toBe('CO');
    expect(cityCountry('Madrid, España')).toBe('ES');
    expect(cityCountry('Ciudad de México')).toBe('MX');
    expect(cityCountry('Tokio')).toBeNull();
  });

  it('un arquetipo se muda a una ciudad estable de tu país', () => {
    expect(localCity(REGIONS.AR!, 7)).toBe(localCity(REGIONS.AR!, 7));
    expect(REGIONS.AR!.cities).toContain(localCity(REGIONS.AR!, 7));
  });

  it('el aviso de "te escribo al rato" suena a su país', () => {
    const ar = ackMessage('en el trabajo', false, () => 0, REGIONS.AR!.ack);
    expect(ar).toContain('en el trabajo');
    expect(ar).not.toMatch(/ahorita/);
  });
});
