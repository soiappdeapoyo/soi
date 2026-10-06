import { describe, it, expect } from 'vitest';
import { coverQueryByRules } from '@/lib/moments/auto-cover';

const first = () => 0;

describe('portada automática: la escena sale del Moment', () => {
  it('palabras del título mandan (noche, mañana, dinero, calma)', () => {
    expect(coverQueryByRules({ title: 'SATS antes de dormir', blocks: [] }, first)).toBe('night sky moon');
    expect(coverQueryByRules({ title: 'Despertar con intención', blocks: [] }, first)).toBe('sunrise horizon');
    expect(coverQueryByRules({ title: 'Mentalidad de riqueza', blocks: [] }, first)).toBe('golden light minimal');
  });
  it('si no, la acción que más se repite; si no, el tipo de Moment', () => {
    expect(coverQueryByRules({ title: 'Pausa', blocks: [{ type: 'breathing' }, { type: 'meditation' }, { type: 'writing' }] }, first)).toBe('calm ocean');
    expect(coverQueryByRules({ title: 'Lee', blocks: [{ type: 'book' }] }, first)).toBe('books window light');
    expect(coverQueryByRules({ title: 'Mi reto', kind: 'challenge', blocks: [] }, first)).toBe('mountain trail');
    expect(coverQueryByRules({ title: 'X', blocks: [] }, first)).toBe('morning light window');
  });
});
