import { describe, expect, it, vi, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { accessTokenFromCookies } from '@/lib/supabase/session-cookie';

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({ auth: { getClaims: async () => ({ data: { claims: { sub: 'u1' } }, error: null }) } }),
}));

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
});

const enc = (o: unknown) => `base64-${Buffer.from(JSON.stringify(o)).toString('base64url')}`;

describe('leer la sesión sin renovarla', () => {
  it('toma el token de acceso de la cookie entera o partida en pedazos', () => {
    expect(accessTokenFromCookies([{ name: 'sb-abc-auth-token', value: enc({ access_token: 'AT', refresh_token: 'RT' }) }])).toBe('AT');
    const v = enc({ access_token: 'AT2', refresh_token: 'RT', user: { pad: 'x'.repeat(50) } });
    const cut = Math.floor(v.length / 2);
    expect(accessTokenFromCookies([
      { name: 'sb-abc-auth-token.1', value: v.slice(cut) },
      { name: 'sb-abc-auth-token.0', value: v.slice(0, cut) },
      { name: 'soi_vid', value: 'x' },
    ])).toBe('AT2');
  });
  it('ignora el verificador de PKCE, cookies rotas o sin sesión', () => {
    expect(accessTokenFromCookies([{ name: 'sb-abc-auth-token-code-verifier', value: enc('v') }])).toBeNull();
    expect(accessTokenFromCookies([{ name: 'sb-abc-auth-token', value: 'base64-@@@' }])).toBeNull();
    expect(accessTokenFromCookies([])).toBeNull();
  });
});

describe('con sesión, /login lleva adentro', () => {
  const req = (path: string) => new NextRequest(`https://yosoi.app${path}`, {
    headers: { host: 'yosoi.app', cookie: `sb-abc-auth-token=${enc({ access_token: 'AT' })}` },
  });
  it('a Hoy, o a donde iba (solo rutas propias)', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware');
    expect((await updateSession(req('/login'))).headers.get('location')).toBe('https://yosoi.app/hoy');
    expect((await updateSession(req('/login?next=%2Fchat%3Fnueva%3D1'))).headers.get('location')).toBe('https://yosoi.app/chat?nueva=1');
    expect((await updateSession(req('/login?next=%2F%2Fmalo.com'))).headers.get('location')).toBe('https://yosoi.app/hoy');
    expect((await updateSession(req('/hoy'))).status).toBe(200);
  });
}, 20_000);
