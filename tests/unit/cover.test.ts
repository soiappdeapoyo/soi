import { describe, it, expect, vi, beforeEach } from 'vitest';

const removed: string[][] = [];
let verdict: { allowed: boolean; reason: string } | null = { allowed: true, reason: 'ok' };
let exists = true;

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    storage: { from: () => ({
      download: async () => (exists ? { data: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }), error: null } : { data: null, error: { message: 'not found' } }),
      remove: async (paths: string[]) => { removed.push(paths); return { error: null }; },
    }) },
  }),
}));
vi.mock('@/lib/ai/image-moderation', () => ({
  moderateImage: async () => verdict,
  IMAGE_REASON_COPY: { sexual: 'Esa imagen no se puede publicar en SOI.' },
}));

beforeEach(() => { removed.length = 0; verdict = { allowed: true, reason: 'ok' }; exists = true; });

describe('portadas de Moments', () => {
  it('distingue portadas subidas de las de la app', async () => {
    const { isUserCover } = await import('@/lib/moments/cover');
    expect(isUserCover('abc/cover/x.webp')).toBe(true);
    expect(isUserCover('/moments/neville-sats.webp')).toBe(false);
    expect(isUserCover(null)).toBe(false);
  });
  it('aprobada → ok; rechazada → se borra; sin revisión → unavailable (privado se guarda, publicado no)', async () => {
    const { reviewCover } = await import('@/lib/moments/cover');
    expect(await reviewCover('u/cover/a.png')).toEqual({ status: 'ok' });
    verdict = { allowed: false, reason: 'sexual' };
    expect(await reviewCover('u/cover/b.png')).toEqual({ status: 'blocked', message: 'Esa imagen no se puede publicar en SOI.' });
    expect(removed).toEqual([['u/cover/b.png']]);
    verdict = null;
    expect(await reviewCover('u/cover/c.png')).toEqual({ status: 'unavailable' });
    exists = false;
    expect(await reviewCover('u/cover/d.png')).toEqual({ status: 'missing' });
  });
  it('reduce la imagen antes de moderarla', async () => {
    const real = await vi.importActual<typeof import('@/lib/ai/image-moderation')>('@/lib/ai/image-moderation');
    const sharp = (await import('sharp')).default;
    const big = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#88aacc' } }).png().toBuffer();
    const out = await real.prepareForModeration(new Uint8Array(big), 'image/png');
    const meta = await sharp(out.data).metadata();
    expect(out.mediaType).toBe('image/jpeg');
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(768);
    expect(out.data.length).toBeLessThan(big.length);
  });
});
