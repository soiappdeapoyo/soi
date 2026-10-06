import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/ai/fallback', () => ({ objectWithFallback: async () => { throw new Error('sin IA'); } }));
import { moderatePost } from '@/lib/ai/moderation';

describe('moderación del perfil de creador', () => {
  it('presentarse y contar su método no es autopromoción', async () => {
    const bio = 'Soy coach de hábitos con 10 años acompañando a mujeres. Mi método combina Hal Elrod y James Clear; el precio de mis Moments premium es justo.';
    expect((await moderatePost(bio, 'creator')).allowed).toBe(true);
  });
  it('sacar a la gente de SOI sí se bloquea', async () => {
    expect((await moderatePost('Escríbeme por WhatsApp para mi programa', 'creator')).reason).toBe('venta');
    expect((await moderatePost('Llámame al 55 1234 5678', 'creator')).reason).toBe('venta');
    expect((await moderatePost('Visita mipagina.com', 'creator')).reason).toBe('link');
  });
  it('en la comunidad sigue igual', async () => {
    expect((await moderatePost('Vendo mi curso, precio especial', 'community')).reason).toBe('venta');
  });
});
