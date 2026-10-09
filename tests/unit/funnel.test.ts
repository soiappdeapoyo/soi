import { describe, expect, it } from 'vitest';
import { analyzeFilm, analyzeFunnel, filmDetail, geoFromHeaders, referrerHost, visitorFrom, type FunnelRow } from '@/lib/analytics/funnel';

const row = (vid: string, event: FunnelRow['event'], extra: Partial<FunnelRow> = {}): FunnelRow =>
  ({ visitor_id: vid, event, detail: null, country: 'MX', region: 'CMX', city: 'Mexico City', referrer: null, user_id: null, at: '2026-10-08T10:00:00Z', ...extra });

describe('embudo de la landing', () => {
  it('lee país y ciudad de Vercel (decodificados) y nunca la IP', () => {
    const h = new Headers({ 'x-vercel-ip-country': 'MX', 'x-vercel-ip-country-region': 'JAL', 'x-vercel-ip-city': 'Guadalajara%20Centro', 'x-forwarded-for': '1.2.3.4' });
    expect(geoFromHeaders(h)).toEqual({ country: 'MX', region: 'JAL', city: 'Guadalajara Centro' });
    expect(geoFromHeaders(new Headers())).toEqual({ country: null, region: null, city: null });
  });

  it('solo guarda el dominio de referencia y descarta el propio', () => {
    expect(referrerHost('https://www.instagram.com/p/abc?x=1', 'yosoi.app')).toBe('instagram.com');
    expect(referrerHost('https://yosoi.app/precio', 'yosoi.app')).toBeNull();
    expect(referrerHost('no es url')).toBeNull();
    expect(visitorFrom('3f2b1c9e-1d2a-4b5c-8d9e-0a1b2c3d4e5f')).toBeTruthy();
    expect(visitorFrom('<script>')).toBeNull();
  });

  it('cuenta visitantes por paso, abandonos y lugares', () => {
    const rows = [
      row('a', 'landing_view', { referrer: 'instagram.com' }), row('a', 'cta_click', { detail: 'hero' }), row('a', 'login_view'), row('a', 'auth_start'), row('a', 'signup'),
      row('b', 'landing_view'), row('b', 'cta_click', { detail: 'precio' }), row('b', 'login_view'),
      row('c', 'landing_view', { country: 'ES', city: 'Madrid' }),
      row('d', 'landing_view'), row('d', 'cta_click', { detail: 'hero' }), row('d', 'login_view'), row('d', 'auth_start'),
      row('e', 'login_view'), row('e', 'login'),
    ];
    const f = analyzeFunnel(rows);
    expect(f.steps.map((s) => s.count)).toEqual([4, 4, 2, 1]);
    expect(f.abandoned).toBe(2); // b y d quisieron entrar y no entraron
    expect(f.abandonedAfterAuth).toBe(1); // d empezó con Google y no terminó
    expect(f.logins).toBe(1);
    expect(f.ctas).toEqual([{ where: 'hero', n: 2 }, { where: 'precio', n: 1 }]);
    expect(f.referrers).toEqual([{ host: 'instagram.com', n: 1 }]);
    expect(f.countries[0]).toMatchObject({ country: 'MX', visitors: 4, wanted: 4, signups: 1 });
    expect(f.cities.find((c) => c.city === 'Madrid')).toMatchObject({ visitors: 1, wanted: 0 });
  });
});

describe('animación «cómo funciona SOI»', () => {
  const film = (vid: string, scenes: number[], where = 'landing') => scenes.map((n) => row(vid, 'film_progress', { detail: filmDetail(where, n) }));

  it('cuenta cada visitante hasta la escena más lejana, por lugar', () => {
    const rows = [
      ...film('a', [1, 2, 3, 4, 5]), ...film('b', [1, 2]), ...film('c', [1, 3]), // c tocó la escena 3
      row('c', 'film_interact', { detail: filmDetail('landing', 'scene') }), row('b', 'film_interact', { detail: filmDetail('landing', 'pause') }),
      ...film('d', [1, 2, 3], 'emociones:ansiedad'),
    ];
    const f = analyzeFilm(rows);
    expect(f.places[0]).toMatchObject({ where: 'landing', viewers: 3, scenes: [3, 3, 2, 1, 1], pauses: 1, taps: 1 });
    expect(f.places[1]).toMatchObject({ where: 'emociones:ansiedad', viewers: 1, scenes: [1, 1, 1, 0, 0] });
  });

  it('compara el registro de quien la vio completa contra quien no la vio', () => {
    const rows = [
      row('a', 'landing_view'), ...film('a', [1, 2, 3, 4, 5]), row('a', 'signup'),
      row('b', 'landing_view'), ...film('b', [1, 2, 3, 4, 5]),
      row('c', 'landing_view'), row('c', 'signup'),
      row('d', 'landing_view'), row('e', 'landing_view'),
    ];
    const c = analyzeFilm(rows).landingCompare!;
    expect(c.completed).toEqual({ visitors: 2, signups: 1, rate: 0.5 });
    expect(c.notSeen.visitors).toBe(3);
    expect(c.notSeen.signups).toBe(1);
  });

  it('no altera el embudo de la landing ni acepta detalles inválidos', () => {
    const rows = [row('a', 'landing_view'), ...film('a', [1, 2]), ...film('z', [1], 'emociones'), row('x', 'film_progress', { detail: 'landing:9' }), row('y', 'film_progress', { detail: null })];
    expect(analyzeFunnel(rows).visitors).toBe(1);
    expect(analyzeFilm(rows).places.find((p) => p.where === 'landing')?.viewers).toBe(1);
    expect(filmDetail('emociones:sentirse-estancado', 5)).toBe('emociones:sentirse-estancado:5');
  });
});
