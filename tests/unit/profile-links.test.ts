import { describe, it, expect } from 'vitest';
import { displayLink, normalizeLink, parseLinks } from '@/lib/social/profile-links';

describe('normalizeLink', () => {
  it('agrega https cuando falta', () => expect(normalizeLink('instagram.com/valeria')).toBe('https://instagram.com/valeria'));
  it('acepta http y https', () => {
    expect(normalizeLink('https://soi.app/')).toBe('https://soi.app/');
    expect(normalizeLink('http://ejemplo.com/a')).toBe('http://ejemplo.com/a');
  });
  it.each(['javascript:alert(1)', 'data:text/html,hola', 'ftp://x.com', 'mailto:a@b.co', 'https://localhost:3000', 'http://192.168.0.1', 'https://user:pass@x.com', 'no es un link', 'https://intranet', ''])(
    'rechaza %s', (u) => expect(normalizeLink(u)).toBeNull(),
  );
});

describe('displayLink / parseLinks', () => {
  it('muestra dominio y ruta sin www', () => expect(displayLink('https://www.instagram.com/valeria/')).toBe('instagram.com/valeria'));
  it('descarta enlaces inválidos guardados y limita a 5', () => {
    const many = Array.from({ length: 7 }, (_, i) => ({ label: '', url: `https://x${i}.com/` }));
    expect(parseLinks([{ label: 'mal', url: 'javascript:alert(1)' }, ...many])).toHaveLength(5);
    expect(parseLinks('nada')).toEqual([]);
  });
});
