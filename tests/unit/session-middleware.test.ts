import { describe, expect, it, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-test';
});

const req = (path: string, cookie?: string, host = 'yosoi.app') =>
  new NextRequest(`https://${host}${path}`, { headers: { host, ...(cookie ? { cookie } : {}) } });

describe('middleware de sesión', () => {
  it('sin sesión, una ruta protegida va a /login con next', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware');
    const r = await updateSession(req('/hoy'));
    expect(r.status).toBe(307);
    expect(r.headers.get('location')).toBe('https://yosoi.app/login?next=%2Fhoy');
  });
  it('una cookie rota no da error: va a /login (y no queda atrapada)', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware');
    const r = await updateSession(req('/hoy', 'sb-example-auth-token=base64-eyJmYWtlIjp0cnVlfQ'));
    expect(r.status).toBe(307);
    expect(r.headers.get('location')).toContain('/login');
  });
  it('www redirige al dominio único', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware');
    const r = await updateSession(req('/login', undefined, 'www.yosoi.app'));
    expect(r.status).toBe(308);
    expect(r.headers.get('location')).toBe('https://yosoi.app/login');
  });
  it('páginas públicas pasan', async () => {
    const { updateSession } = await import('@/lib/supabase/middleware');
    expect((await updateSession(req('/'))).status).toBe(200);
  });
}, 20_000);
