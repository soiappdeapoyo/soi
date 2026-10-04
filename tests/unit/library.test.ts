import { describe, it, expect } from 'vitest';
import { filterExercises, kindOf, type Exercise } from '@/lib/library/exercises';
import { coverFor, isWorkKey } from '@/lib/library/openlibrary';
import { coverUrl, officialCover } from '@/lib/moments/types';
import { officialMoment } from '@/config/official-moments';

const ex = (p: Partial<Exercise>): Exercise => ({ id: 'x', name: 'X', kind: 'calistenia', level: 'Principiante', equipment: 'Sin equipo', muscles: [], secondary: [], instructions: [], frames: [], ...p });

describe('ejercicios', () => {
  it('clasifica calistenia, gimnasio y estiramiento', () => {
    expect(kindOf({ equipment: 'body only', category: 'strength' })).toBe('calistenia');
    expect(kindOf({ equipment: null, category: 'plyometrics' })).toBe('calistenia');
    expect(kindOf({ equipment: 'barbell', category: 'strength' })).toBe('gimnasio');
    expect(kindOf({ equipment: 'body only', category: 'stretching' })).toBe('estiramiento');
  });
  it('filtra por tipo y busca en español sin acentos', () => {
    const list = [ex({ id: 'a', name: 'Pushups', muscles: ['Pecho'] }), ex({ id: 'b', name: 'Squat', kind: 'gimnasio', muscles: ['Glúteos'] })];
    expect(filterExercises(list, { kind: 'calistenia' }).map((e) => e.id)).toEqual(['a']);
    expect(filterExercises(list, { q: 'gluteos' }).map((e) => e.id)).toEqual(['b']);
  });
});

describe('Open Library', () => {
  it('solo acepta claves de obra', () => {
    expect(isWorkKey('/works/OL527464W')).toBe(true);
    expect(isWorkKey('/authors/OL1A')).toBe(false);
    expect(isWorkKey('/works/OL1W/../../x')).toBe(false);
  });
  it('arma la URL de portada', () => {
    expect(coverFor(14542536)).toBe('https://covers.openlibrary.org/b/id/14542536-M.jpg');
    expect(coverFor(undefined)).toBeNull();
  });
});

describe('portadas de Moments', () => {
  it('rutas de la app tal cual; Storage en moment-assets', () => {
    expect(coverUrl('/moments/neville-sats.webp')).toBe('/moments/neville-sats.webp');
    expect(coverUrl('abc/cover/x.webp')).toMatch(/\/storage\/v1\/object\/public\/moment-assets\/abc\/cover\/x\.webp$/);
    expect(coverUrl(null)).toBeNull();
  });
  it('los oficiales tienen portada (igual que la que hereda una versión guardada)', () => {
    expect(officialMoment('brian_tracy_5min')?.cover).toBe('/moments/brian-tracy-5min.webp');
    expect(officialCover('five_am_club')).toBe('/moments/five-am-club.webp');
  });
});
