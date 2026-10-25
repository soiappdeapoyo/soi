import { redact } from '@/lib/admin/conversation-signals';
import { pageLabel } from '@/lib/analytics/nav';

/**
 * «Lo que dicen» (burbuja de opinión de SOI), puro y testeado: calificación promedio y su reparto, cómo va por
 * semana, por pantalla y por dispositivo, y los comentarios recientes. El texto con señales de crisis no se muestra.
 */

export type FeedbackRow = {
  id: string; user_id: string | null; rating: number | null; liked: string | null; disliked: string | null;
  path: string | null; device: string | null; plan: string | null; account_days: number | null;
  source: string; crisis: boolean; created_at: string;
};

export type FeedbackFilter = 'todas' | 'gusta' | 'cambia' | 'baja';

const DAY = 86_400_000;
const round1 = (v: number) => Math.round(v * 10) / 10;
const avgOf = (xs: number[]) => (xs.length ? round1(xs.reduce((s, x) => s + x, 0) / xs.length) : null);
const ratingsOf = (rows: FeedbackRow[]) => rows.map((r) => r.rating).filter((v): v is number => v !== null);

/** Lunes (UTC) de la semana de una fecha. */
function weekStart(ms: number): string {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

function group(rows: FeedbackRow[], key: (r: FeedbackRow) => string) {
  const m = new Map<string, FeedbackRow[]>();
  for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
  return [...m].map(([k, rs]) => {
    const rt = ratingsOf(rs);
    return { key: k, n: rs.length, avg: avgOf(rt), low: rt.filter((v) => v <= 2).length, changes: rs.filter((r) => r.disliked).length };
  }).sort((a, b) => b.n - a.n || a.key.localeCompare(b.key));
}

export function matchesFilter(r: FeedbackRow, f: FeedbackFilter): boolean {
  if (f === 'gusta') return Boolean(r.liked);
  if (f === 'cambia') return Boolean(r.disliked);
  if (f === 'baja') return r.rating !== null && r.rating <= 2;
  return true;
}

export function analyzeFeedback(rows: FeedbackRow[], now = Date.now(), weeks = 8) {
  const rated = ratingsOf(rows);
  const positive = rated.filter((v) => v >= 3).length;
  const firstWeek = Date.parse(weekStart(now - (weeks - 1) * 7 * DAY));
  const byWeek = new Map<string, FeedbackRow[]>();
  for (let i = 0; i < weeks; i++) byWeek.set(weekStart(firstWeek + i * 7 * DAY), []);
  for (const r of rows) {
    const k = weekStart(Date.parse(r.created_at));
    if (byWeek.has(k)) byWeek.get(k)!.push(r);
  }
  return {
    total: rows.length,
    people: new Set(rows.map((r) => r.user_id).filter(Boolean)).size,
    rated: rated.length,
    avg: avgOf(rated),
    positive: { num: positive, den: rated.length, pct: rated.length ? Math.round((positive / rated.length) * 100) : null },
    distribution: [1, 2, 3, 4].map((v) => rated.filter((x) => x === v).length),
    liked: rows.filter((r) => r.liked).length,
    disliked: rows.filter((r) => r.disliked).length,
    prompted: rows.filter((r) => r.source === 'prompt').length,
    crisis: rows.filter((r) => r.crisis).length,
    weekly: [...byWeek].map(([week, rs]) => ({ week, n: rs.length, avg: avgOf(ratingsOf(rs)) })),
    byPath: group(rows, (r) => r.path ?? '(sin pantalla)').map((g) => ({ ...g, label: g.key.startsWith('(') ? g.key : pageLabel(g.key) })),
    byDevice: group(rows, (r) => r.device ?? 'other'),
  };
}

/** Para Analytics IA: cifras y lo que cambiarían, recortado y sin datos de contacto (nunca lo que trae crisis). */
export function feedbackForPmf(rows: FeedbackRow[], maxQuotes = 10) {
  const a = analyzeFeedback(rows);
  const quotes = rows.filter((r) => r.disliked && !r.crisis)
    .sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at)).slice(0, maxQuotes)
    .map((r) => ({ said: redact(r.disliked!, 220), path: r.path, device: r.device, rating: r.rating }));
  const liked = rows.filter((r) => r.liked && !r.crisis)
    .sort((x, y) => Date.parse(y.created_at) - Date.parse(x.created_at)).slice(0, Math.ceil(maxQuotes / 2))
    .map((r) => redact(r.liked!, 160));
  return { count: a.total, people: a.people, rated: a.rated, positive: a.positive.num, avg: a.avg, quotes, liked };
}
