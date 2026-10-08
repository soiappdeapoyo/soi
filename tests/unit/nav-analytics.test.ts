import { describe, expect, it } from 'vitest';
import { analyzeFlows, buildSessions, neighbors, normalizePath, pageLabel, type NavEvent } from '@/lib/analytics/nav';

const T0 = Date.parse('2026-10-08T15:00:00Z');
const ev = (sid: string, kind: 'view' | 'leave', path: string, sec: number, user = 'u1'): NavEvent =>
  ({ user_id: user, session_id: sid, kind, path, at: new Date(T0 + sec * 1000).toISOString() });

describe('normalizePath', () => {
  it('quita ids y parámetros salvo tab', () => {
    expect(normalizePath('/m/3f2b1c9e-1d2a-4b5c-8d9e-0a1b2c3d4e5f/play', 'lista=hoy&auto=1')).toBe('/m/:id/play');
    expect(normalizePath('/mi-vida', 'tab=nuevo-yo&x=1')).toBe('/mi-vida?tab=nuevo-yo');
    expect(normalizePath('/u/cualquiera')).toBe('/u/:id');
    expect(normalizePath('/mensajes/abc')).toBe('/mensajes/:id');
    expect(normalizePath('/m/miracle-morning')).toBe('/m/miracle-morning');
    expect(normalizePath('/chat', 'nueva=1&run=abc')).toBe('/chat');
  });
  it('da nombres legibles', () => {
    expect(pageLabel('/mi-vida?tab=nuevo-yo')).toBe('Mi Vida · Mi Nuevo Yo');
    expect(pageLabel('/m/:id/play')).toBe('Reproductor de Moment');
    expect(pageLabel('/m/miracle-morning')).toBe('Moment · miracle-morning');
  });
});

describe('sesiones', () => {
  it('ordena pantallas, mide el tiempo y corta tras 30 min sin actividad', () => {
    const s = buildSessions([
      ev('a', 'view', '/hoy', 0), ev('a', 'view', '/chat', 20), ev('a', 'leave', '/chat', 80),
      ev('a', 'view', '/mi-vida', 80 + 31 * 60),
    ]);
    expect(s).toHaveLength(2);
    const first = s.find((x) => x.id === 'a')!;
    expect(first.views.map((v) => [v.path, v.dwellMs])).toEqual([['/hoy', 20_000], ['/chat', 60_000]]);
    expect(first.endedByLeave).toBe(true);
  });

  it('volver a la app en la misma pantalla suma tiempo y no es un paso nuevo', () => {
    const [s] = buildSessions([
      ev('a', 'view', '/chat', 0), ev('a', 'leave', '/chat', 30), ev('a', 'view', '/chat', 120), ev('a', 'view', '/hoy', 150),
    ]);
    expect(s!.views.map((v) => [v.path, v.dwellMs])).toEqual([['/chat', 60_000], ['/hoy', null]]);
  });
});

describe('flujos y fricciones', () => {
  it('entradas, salidas, transiciones, rebotes e idas y vueltas', () => {
    const events: NavEvent[] = [];
    for (let i = 0; i < 4; i++) {
      const sid = `sess-pp-${i}`;
      events.push(ev(sid, 'view', '/hoy', 0), ev(sid, 'view', '/impulso', 10), ev(sid, 'view', '/hoy', 13), ev(sid, 'view', '/chat', 40));
    }
    for (let i = 0; i < 6; i++) events.push(ev(`sess-b-${i}`, 'view', '/planes', 0, `u${i}`));
    const f = analyzeFlows(buildSessions(events));
    expect(f.summary.sessions).toBe(10);
    expect(f.summary.bounceRate).toBeCloseTo(0.6);
    expect(f.entries[0]).toMatchObject({ path: '/planes', count: 6 });
    expect(f.transitions.find((t) => t.path === '/hoy → /impulso')?.count).toBe(4);
    expect(f.frictions.map((x) => x.kind)).toEqual(expect.arrayContaining(['bounce', 'pingpong']));
    const n = neighbors(buildSessions(events), '/hoy');
    expect(n.next[0]).toMatchObject({ path: '/impulso', count: 4 });
    expect(n.prev.find((p) => p.path === '(inicio de sesión)')?.count).toBe(4);
  });
});
