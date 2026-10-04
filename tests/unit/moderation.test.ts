import { describe, it, expect } from 'vitest';
import { hardFilter } from '@/lib/ai/moderation';

describe('hardFilter (mensajes directos, sin IA)', () => {
  it.each(['mira www.ofertas.com', 'entra a https://x.co', 'te dejo mi tienda.mx'])('bloquea enlaces: %s', (t) => expect(hardFilter(t)).toBe('link'));
  it.each(['vendo cursos baratos', 'escríbeme al whatsapp', 'link en bio'])('bloquea ventas: %s', (t) => expect(hardFilter(t)).toBe('venta'));
  it.each(['¿cómo te fue con el ritual?', 'gracias por tu mensaje, me ayudó mucho'])('permite conversación normal: %s', (t) => expect(hardFilter(t)).toBeNull());
});
