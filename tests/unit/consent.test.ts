import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));
vi.mock('next/cache', () => ({ unstable_cache: (fn: unknown) => fn }));

const current = { terminos: 't2', privacidad: 'p1', privacidad_corto: 's1' };

describe('consentimiento legal', () => {
  it('sin aceptación previa hay que aceptar', async () => {
    const { consentState } = await import('@/lib/consent');
    expect(consentState(null, current)).toBe('missing');
  });

  it('una versión nueva de los términos o del aviso vuelve a pedirlo', async () => {
    const { consentState } = await import('@/lib/consent');
    expect(consentState({ terms_version: 't1', privacy_version: 'p1' }, current)).toBe('updated');
    expect(consentState({ terms_version: 't2', privacy_version: null }, current)).toBe('updated');
    expect(consentState({ terms_version: 't2', privacy_version: 'p1' }, current)).toBe('ok');
  });

  it('el aviso simplificado no obliga a aceptar de nuevo', async () => {
    const { consentState } = await import('@/lib/consent');
    expect(consentState({ terms_version: 't2', privacy_version: 'p1' }, { ...current, privacidad_corto: 's9' })).toBe('ok');
  });

  it('aceptó la plantilla base y aún no hay documentos publicados', async () => {
    const { consentState } = await import('@/lib/consent');
    expect(consentState({ terms_version: null, privacy_version: null }, { terminos: null, privacidad: null, privacidad_corto: null })).toBe('ok');
  });

  it('solo regresa a rutas internas', async () => {
    const { safeNext } = await import('@/lib/consent');
    expect(safeNext('/chat?nueva=1')).toBe('/chat?nueva=1');
    expect(safeNext('//evil.com')).toBe('/hoy');
    expect(safeNext('https://evil.com')).toBe('/hoy');
    expect(safeNext('/consentimiento')).toBe('/hoy');
    expect(safeNext(undefined)).toBe('/hoy');
  });
});
