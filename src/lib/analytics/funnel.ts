/**
 * Embudo de la landing (para /panel/analytics): visita → toca entrar → /login → inicia con Google o enlace
 * → se registra. Puro y testeado: geolocalización desde los encabezados de Vercel y métricas por visitante.
 */

export const FUNNEL_EVENTS = ['landing_view', 'cta_click', 'login_view', 'auth_start', 'signup', 'login', 'film_progress', 'film_interact'] as const;
export type FunnelEventName = (typeof FUNNEL_EVENTS)[number];
export const VISITOR_COOKIE = 'soi_vid';

export type Geo = { country: string | null; region: string | null; city: string | null };

const decode = (v: string | null, max: number) => {
  if (!v) return null;
  try { return decodeURIComponent(v).trim().slice(0, max) || null; } catch { return v.trim().slice(0, max) || null; }
};

/** País, región y ciudad que Vercel calcula por la IP (la IP no se guarda). */
export function geoFromHeaders(h: Headers): Geo {
  return {
    country: decode(h.get('x-vercel-ip-country'), 8),
    region: decode(h.get('x-vercel-ip-country-region'), 80),
    city: decode(h.get('x-vercel-ip-city'), 80),
  };
}

/** Solo el dominio de referencia (de dónde llegó: instagram.com, google.com…), nunca la URL completa. */
export function referrerHost(ref: string | null | undefined, ownHost?: string | null): string | null {
  if (!ref) return null;
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '').slice(0, 120);
    return host && host !== ownHost?.replace(/^www\./, '') ? host : null;
  } catch { return null; }
}

/** Visitante válido de la cookie (o null). */
export function visitorFrom(value: string | null | undefined): string | null {
  return value && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : null;
}

export type FunnelRow = {
  visitor_id: string | null; event: FunnelEventName; detail: string | null;
  country: string | null; region: string | null; city: string | null; referrer: string | null; user_id: string | null; at: string;
};

const COUNTRY = new Intl.DisplayNames(['es'], { type: 'region' });
export function countryName(code: string | null): string {
  if (!code) return 'Desconocido';
  try { return COUNTRY.of(code.toUpperCase()) ?? code; } catch { return code; }
}

/** Embudo por visitante único (sin cookie, cada fila cuenta como visitante propio). */
export function analyzeFunnel(rows: FunnelRow[]) {
  const key = (r: FunnelRow, i: number) => r.visitor_id ?? `anon-${i}`;
  const by = new Map<string, Set<FunnelEventName>>();
  const geoOf = new Map<string, { country: string | null; city: string | null }>();
  const ctas = new Map<string, number>();
  const refs = new Map<string, number>();
  rows.forEach((r, i) => {
    if (FILM_EVENTS.has(r.event)) return; // la animación tiene su propio análisis (analyzeFilm)
    const k = key(r, i);
    let set = by.get(k);
    if (!set) { set = new Set(); by.set(k, set); }
    set.add(r.event);
    if (!geoOf.has(k) && (r.country || r.city)) geoOf.set(k, { country: r.country, city: r.city });
    if (r.event === 'cta_click' && r.detail) ctas.set(r.detail, (ctas.get(r.detail) ?? 0) + 1);
    if (r.event === 'landing_view' && r.referrer) refs.set(r.referrer, (refs.get(r.referrer) ?? 0) + 1);
  });

  const visitors = [...by.entries()];
  const has = (s: Set<FunnelEventName>, e: FunnelEventName) => s.has(e);
  const entered = (s: Set<FunnelEventName>) => s.has('signup') || s.has('login');
  const count = (pred: (s: Set<FunnelEventName>) => boolean) => visitors.filter(([, s]) => pred(s)).length;

  const wanted = (s: Set<FunnelEventName>) => has(s, 'cta_click') || has(s, 'login_view');
  const steps = [
    { id: 'landing_view', label: 'Visitaron la landing', count: count((s) => has(s, 'landing_view')) },
    { id: 'wanted', label: 'Quisieron entrar (tocaron un botón o abrieron /login)', count: count(wanted) },
    { id: 'auth_start', label: 'Empezaron con Google o con su correo', count: count((s) => has(s, 'auth_start')) },
    { id: 'signup', label: 'Se registraron', count: count((s) => has(s, 'signup')) },
  ];
  // Quisieron entrar (tocaron entrar o llegaron a /login) y no se registraron ni iniciaron sesión.
  const abandoned = count((s) => (has(s, 'cta_click') || has(s, 'login_view')) && !entered(s));
  const abandonedAfterAuth = count((s) => has(s, 'auth_start') && !entered(s));

  type GeoRow = { key: string; country: string | null; city: string | null; visitors: number; wanted: number; signups: number };
  const geo = (level: 'country' | 'city') => {
    const m = new Map<string, GeoRow>();
    for (const [k, s] of visitors) {
      const g = geoOf.get(k) ?? { country: null, city: null };
      const id = level === 'country' ? g.country ?? '?' : `${g.country ?? '?'}|${g.city ?? '?'}`;
      const row = m.get(id) ?? { key: id, country: g.country, city: level === 'city' ? g.city : null, visitors: 0, wanted: 0, signups: 0 };
      row.visitors++;
      if (has(s, 'cta_click') || has(s, 'login_view')) row.wanted++;
      if (has(s, 'signup')) row.signups++;
      m.set(id, row);
    }
    return [...m.values()].sort((a, b) => b.visitors - a.visitors || b.signups - a.signups);
  };

  return {
    visitors: visitors.length,
    steps,
    abandoned,
    abandonedAfterAuth,
    logins: count((s) => has(s, 'login') && !has(s, 'signup')),
    countries: geo('country').slice(0, 15),
    cities: geo('city').slice(0, 20),
    ctas: [...ctas].sort((a, b) => b[1] - a[1]).map(([where, n]) => ({ where, n })),
    referrers: [...refs].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([host, n]) => ({ host, n })),
  };
}

/* ---------- La animación "cómo funciona SOI" (landing y /emociones) ---------- */

const FILM_EVENTS = new Set<FunnelEventName>(['film_progress', 'film_interact']);
export const FILM_SCENES = 5;
export type FilmInteraction = 'pause' | 'play' | 'scene';

/** `detail` de los eventos de la animación: dónde está y qué escena (1–5) o interacción. */
export const filmDetail = (where: string, what: number | FilmInteraction) => `${where.slice(0, 48)}:${what}`;

function parseFilmDetail(detail: string | null): { where: string; what: string } | null {
  const i = detail?.lastIndexOf(':') ?? -1;
  return detail && i > 0 ? { where: detail.slice(0, i), what: detail.slice(i + 1) } : null;
}

/**
 * Cuánto de la animación ve la gente y si quien la ve se registra más. Por lugar (`landing`, `emociones`,
 * `emociones:<slug>`): visitantes que llegaron a cada escena (cada quien cuenta hasta la más lejana), pausas y
 * toques de escena. Solo en la landing se compara el registro de quien la vio completa contra quien no la vio.
 */
export function analyzeFilm(rows: FunnelRow[]) {
  type Acc = { reached: Map<string, number>; pauses: Set<string>; taps: Set<string> };
  const places = new Map<string, Acc>();
  const signedUp = new Set<string>();
  const landingVisitors = new Set<string>();
  const anyFilm = new Set<string>();

  rows.forEach((r, i) => {
    const vid = r.visitor_id ?? `anon-${i}`;
    if (r.event === 'signup') signedUp.add(vid);
    if (r.event === 'landing_view') landingVisitors.add(vid);
    if (!FILM_EVENTS.has(r.event)) return;
    const d = parseFilmDetail(r.detail);
    if (!d) return;
    const acc = places.get(d.where) ?? { reached: new Map(), pauses: new Set(), taps: new Set() };
    places.set(d.where, acc);
    if (r.event === 'film_progress') {
      const n = Number(d.what);
      if (!Number.isInteger(n) || n < 1 || n > FILM_SCENES) return;
      anyFilm.add(vid);
      acc.reached.set(vid, Math.max(acc.reached.get(vid) ?? 0, n));
    } else if (d.what === 'pause') acc.pauses.add(vid);
    else if (d.what === 'scene') acc.taps.add(vid);
  });

  const rate = (ids: Iterable<string>) => {
    const list = [...ids];
    const signups = list.filter((v) => signedUp.has(v)).length;
    return { visitors: list.length, signups, rate: list.length ? signups / list.length : 0 };
  };

  const byPlace = [...places].map(([where, a]) => {
    const max = [...a.reached.values()];
    return {
      where,
      viewers: a.reached.size,
      scenes: Array.from({ length: FILM_SCENES }, (_, i) => max.filter((m) => m >= i + 1).length),
      pauses: a.pauses.size,
      taps: a.taps.size,
      completedSignup: rate([...a.reached].filter(([, m]) => m >= FILM_SCENES).map(([v]) => v)),
    };
  }).sort((a, b) => (a.where === 'landing' ? -1 : b.where === 'landing' ? 1 : b.viewers - a.viewers));

  const landing = places.get('landing');
  return {
    places: byPlace,
    /** Landing: registro de quien vio la animación completa vs. quien visitó la landing sin verla. */
    landingCompare: landing ? {
      completed: rate([...landing.reached].filter(([, m]) => m >= FILM_SCENES).map(([v]) => v)),
      notSeen: rate([...landingVisitors].filter((v) => !anyFilm.has(v))),
      landingVisitors: landingVisitors.size,
    } : null,
  };
}
