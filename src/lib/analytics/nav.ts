/**
 * Navegación dentro de la app (para /panel/analytics): normalización de rutas, sesiones y métricas de flujo.
 * Puro y testeado: sin base de datos ni React.
 */

export type NavKind = 'view' | 'leave';
export type NavEvent = { user_id: string | null; session_id: string; kind: NavKind; path: string; at: string };

/** Una sesión termina tras 30 min sin actividad (también en el navegador). */
export const SESSION_IDLE_MS = 30 * 60_000;
/** Una pantalla no cuenta más de 30 min (pestaña olvidada abierta). */
const MAX_DWELL_MS = 30 * 60_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Segmentos que siempre son un id o un nombre de usuario (aunque no lo parezcan). */
const ID_AFTER = new Set(['u', 'p', 'c', 'b', 'mensajes', 'recursos', 'yo', 'ideas', 'implementaciones', 'aceptaciones']);
const KEEP_PARAMS = ['tab'];

/** Ruta sin datos personales: ids → :id, solo ?tab= como parámetro. */
export function normalizePath(pathname: string, search = ''): string {
  const parts = pathname.split('/').filter(Boolean).slice(0, 6);
  const out = parts.map((seg, i) => {
    const prev = parts[i - 1];
    if (UUID.test(seg) || /^\d+$/.test(seg)) return ':id';
    if (prev && ID_AFTER.has(prev)) return ':id';
    // Slugs largos con números (ids de otros sistemas); los slugs de Moments oficiales se conservan.
    if (seg.length >= 20 && /\d/.test(seg)) return ':id';
    return seg.slice(0, 40);
  });
  const params = new URLSearchParams(search);
  const kept = KEEP_PARAMS.filter((k) => params.get(k)).map((k) => `${k}=${(params.get(k) ?? '').slice(0, 30)}`);
  return `/${out.join('/')}${kept.length ? `?${kept.join('&')}` : ''}`.slice(0, 200);
}

const LABELS: Record<string, string> = {
  '/hoy': 'Hoy',
  '/chat': 'SOI (chat)',
  '/impulso': 'Impulso',
  '/impulso/explorar': 'Impulso · Explorar',
  '/impulso/guardados': 'Impulso · Guardados',
  '/mi-vida': 'Mi Vida · Mi día',
  '/mi-vida?tab=dia': 'Mi Vida · Mi día',
  '/mi-vida?tab=moments': 'Mi Vida · Moments',
  '/mi-vida?tab=nuevo-yo': 'Mi Vida · Mi Nuevo Yo',
  '/mi-vida?tab=batallas': 'Mi Vida · Batallas',
  '/mi-vida?tab=biblioteca': 'Mi Vida · Biblioteca',
  '/yo': 'Yo',
  '/m/nuevo': 'Crear un Moment',
  '/m/:id': 'Detalle de un Moment',
  '/m/:id/play': 'Reproductor de Moment',
  '/ritual': 'Ritual diario',
  '/evidencias': 'Muro de Evidencias',
  '/planes': 'Planes SOI+',
  '/ajustes': 'Ajustes',
  '/perfil': 'Perfil e identidad',
  '/mensajes': 'Mensajes',
  '/mensajes/:id': 'Conversación (mensajes)',
  '/actividad': 'Actividad',
  '/onboarding': 'Onboarding',
  '/consentimiento': 'Consentimiento legal',
  '/u/:id': 'Perfil de otra persona',
  '/p/:id': 'Publicación',
};

/** Nombre legible de una pantalla. */
export function pageLabel(path: string): string {
  if (LABELS[path]) return LABELS[path];
  const [base, query] = path.split('?');
  if (base && LABELS[base]) return `${LABELS[base]}${query ? ` (${query})` : ''}`;
  if (base?.startsWith('/m/') && base.endsWith('/play')) return `Reproductor · ${base.split('/')[2]}`;
  if (base?.startsWith('/m/')) return `Moment · ${base.split('/')[2]}`;
  if (base?.startsWith('/mi-vida/batallas/')) return `Batalla · ${base.split('/')[3]}`;
  return path;
}

export type View = { path: string; at: string; dwellMs: number | null };
export type Session = { id: string; userId: string | null; start: string; end: string; views: View[]; endedByLeave: boolean };

/**
 * Agrupa eventos en sesiones (por session_id, cortando tras 30 min sin actividad) con el tiempo en cada pantalla.
 * Recargar o volver a la app en la misma pantalla no es un paso nuevo: se sigue sumando su tiempo.
 */
export function buildSessions(events: NavEvent[]): Session[] {
  const bySid = new Map<string, NavEvent[]>();
  for (const e of events) {
    const list = bySid.get(e.session_id) ?? [];
    list.push(e);
    bySid.set(e.session_id, list);
  }
  const sessions: Session[] = [];
  for (const [sid, list] of bySid) {
    list.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
    let cur: Session | null = null;
    let openSince: number | null = null;
    let lastAt = 0;
    let part = 0;
    const close = (t: number) => {
      const v = cur?.views[cur.views.length - 1];
      if (v && openSince !== null) v.dwellMs = Math.min(MAX_DWELL_MS, (v.dwellMs ?? 0) + Math.max(0, t - openSince));
      openSince = null;
    };
    for (const e of list) {
      const t = Date.parse(e.at);
      if (!cur || t - lastAt > SESSION_IDLE_MS) {
        if (cur?.views.length) sessions.push(cur);
        cur = { id: part ? `${sid}#${part}` : sid, userId: e.user_id, start: e.at, end: e.at, views: [], endedByLeave: false };
        openSince = null;
        part++;
      }
      const prev = cur.views[cur.views.length - 1];
      if (e.kind === 'view') {
        if (prev && prev.path === e.path) {
          if (openSince === null) openSince = t; // volvió a la app en la misma pantalla
        } else {
          close(t);
          cur.views.push({ path: e.path, at: e.at, dwellMs: null });
          openSince = t;
        }
        cur.endedByLeave = false;
      } else {
        close(t);
        cur.endedByLeave = true;
      }
      cur.end = e.at;
      lastAt = t;
    }
    if (cur?.views.length) sessions.push(cur);
  }
  return sessions.sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
}

type Count = { path: string; count: number; share: number };
const ranked = (m: Map<string, number>, total: number, limit = 12): Count[] =>
  [...m].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([path, count]) => ({ path, count, share: total ? count / total : 0 }));
const inc = (m: Map<string, number>, k: string, by = 1) => m.set(k, (m.get(k) ?? 0) + by);
const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : Math.round((s[mid - 1]! + s[mid]!) / 2);
};

export type PageStat = { path: string; views: number; exits: number; exitRate: number; medianDwellMs: number | null; quickExits: number; bounces: number };
export type Friction = { kind: 'exit' | 'bounce' | 'pingpong' | 'quick'; path: string; detail: string; weight: number };

/** Métricas de flujo para el panel. */
export function analyzeFlows(sessions: Session[]) {
  const entries = new Map<string, number>();
  const exits = new Map<string, number>();
  const transitions = new Map<string, number>();
  const journeys = new Map<string, number>();
  const pingpong = new Map<string, number>();
  const pages = new Map<string, { views: number; exits: number; dwell: number[]; quick: number; bounces: number }>();
  const page = (p: string) => {
    let s = pages.get(p);
    if (!s) { s = { views: 0, exits: 0, dwell: [], quick: 0, bounces: 0 }; pages.set(p, s); }
    return s;
  };

  let totalViews = 0;
  let bounces = 0;
  const durations: number[] = [];
  for (const s of sessions) {
    const v = s.views;
    if (!v.length) continue;
    inc(entries, v[0]!.path);
    inc(exits, v[v.length - 1]!.path);
    page(v[v.length - 1]!.path).exits++;
    if (v.length === 1) { bounces++; page(v[0]!.path).bounces++; }
    inc(journeys, v.slice(0, 4).map((x) => x.path).join(' → '));
    durations.push(Date.parse(s.end) - Date.parse(s.start));
    v.forEach((x, i) => {
      totalViews++;
      const st = page(x.path);
      st.views++;
      if (x.dwellMs !== null) {
        st.dwell.push(x.dwellMs);
        // Salió en menos de 5 s hacia otra pantalla: no era lo que buscaba.
        if (x.dwellMs < 5000 && i < v.length - 1) st.quick++;
      }
      const next = v[i + 1];
      if (next) inc(transitions, `${x.path} → ${next.path}`);
      // Ida y vuelta: A → B → A en menos de 15 s en B (se equivocó de pantalla o no encontró algo).
      const back = v[i + 2];
      if (next && back && back.path === x.path && next.dwellMs !== null && next.dwellMs < 15_000) inc(pingpong, `${x.path} → ${next.path} → ${x.path}`);
    });
  }

  const pageStats: PageStat[] = [...pages].map(([path, s]) => ({
    path, views: s.views, exits: s.exits, exitRate: s.views ? s.exits / s.views : 0,
    medianDwellMs: median(s.dwell), quickExits: s.quick, bounces: s.bounces,
  })).sort((a, b) => b.views - a.views);

  // Fricciones: lo que más abandona, rebota o confunde (con un mínimo de volumen para no alarmar por 1 caso).
  const frictions: Friction[] = [];
  for (const p of pageStats) {
    if (p.views >= 10 && p.exitRate >= 0.4 && p.path !== '/consentimiento') frictions.push({ kind: 'exit', path: p.path, detail: `${Math.round(p.exitRate * 100)} % de las visitas termina aquí la sesión`, weight: p.exits });
    if (p.bounces >= 5) frictions.push({ kind: 'bounce', path: p.path, detail: `${p.bounces} sesiones abren solo esta pantalla y se van`, weight: p.bounces });
    if (p.views >= 10 && p.quickExits / p.views >= 0.3) frictions.push({ kind: 'quick', path: p.path, detail: `${Math.round((p.quickExits / p.views) * 100)} % sale en menos de 5 s a otra pantalla`, weight: p.quickExits });
  }
  for (const [route, count] of pingpong) if (count >= 3) frictions.push({ kind: 'pingpong', path: route, detail: `${count} veces van y regresan en segundos`, weight: count });
  frictions.sort((a, b) => b.weight - a.weight);

  const n = sessions.length;
  return {
    summary: {
      sessions: n,
      users: new Set(sessions.map((s) => s.userId).filter(Boolean)).size,
      views: totalViews,
      pagesPerSession: n ? totalViews / n : 0,
      medianSessionMs: median(durations),
      bounceRate: n ? bounces / n : 0,
    },
    entries: ranked(entries, n),
    exits: ranked(exits, n),
    transitions: ranked(transitions, totalViews, 20),
    journeys: ranked(journeys, n, 10),
    pages: pageStats,
    frictions: frictions.slice(0, 12),
  };
}

/** A dónde va la gente después de una pantalla (y de dónde llega). */
export function neighbors(sessions: Session[], path: string) {
  const next = new Map<string, number>();
  const prev = new Map<string, number>();
  let views = 0;
  let exits = 0;
  for (const s of sessions) {
    s.views.forEach((v, i) => {
      if (v.path !== path) return;
      views++;
      const n = s.views[i + 1];
      if (n) inc(next, n.path); else exits++;
      inc(prev, s.views[i - 1]?.path ?? '(inicio de sesión)');
    });
  }
  if (exits) next.set('(sale de la app)', exits);
  return { views, next: ranked(next, views, 10), prev: ranked(prev, views, 10) };
}
