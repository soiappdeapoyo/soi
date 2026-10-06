import { after } from 'next/server';
import { z } from 'zod/v3';
import { createAdminClient } from '@/lib/supabase/server';
import { FAST_ORDER, objectWithFallback } from '@/lib/ai/fallback';
import type { ActionBlock, MomentKind } from '@/config/actions';

/**
 * Portada automática de cada Moment nuevo: una foto aesthetic relacionada, de una biblioteca gratuita.
 * - Búsqueda: Pexels si hay PEXELS_API_KEY; si no, Openverse sin clave (solo CC0 / dominio público, primero StockSnap).
 * - Liviana: se reduce a 640×360 WebP (~20–40 KB) y se guarda UNA vez en moment-assets/auto/<proveedor>-<id>.webp;
 *   los Moments que usan la misma foto comparten el archivo (nunca se borra al cambiar la portada).
 * - Nunca pisa una portada elegida por la persona (solo escribe si cover_path sigue vacío). Ella puede cambiarla después.
 */

type CoverInput = { title: string; objective?: string | null; kind?: MomentKind | string | null; blocks?: Pick<ActionBlock, 'type'>[] };
type Photo = { key: string; url: string };

const WIDTH = 640;
const HEIGHT = 360;

/** Temas aesthetic por tipo de acción (en inglés: así buscan las bibliotecas). */
const THEMES: [ActionBlock['type'][], string[]][] = [
  [['breathing', 'meditation', 'rest'], ['calm ocean', 'misty forest', 'zen stones', 'soft clouds', 'still lake']],
  [['exercise', 'walk', 'stretching'], ['mountain trail', 'yoga sunrise', 'forest path', 'morning run']],
  [['book', 'reading', 'document'], ['books window light', 'open book coffee', 'reading nook']],
  [['writing', 'gratitude', 'reflection', 'goal', 'contract', 'weekly_review', 'canvas', 'mind_map'], ['notebook coffee', 'journal desk', 'morning light window']],
  [['visualization', 'affirmation'], ['sunrise horizon', 'starry sky', 'wildflowers light']],
  [['pomodoro', 'agenda', 'checklist', 'tracking', 'next_step'], ['minimal desk plant', 'clean workspace']],
  [['music', 'audio'], ['vinyl record warm light', 'headphones calm']],
];
const BY_KIND: Record<string, string[]> = {
  recovery: ['calm ocean', 'misty forest', 'soft clouds'],
  growth: ['mountain summit sunrise', 'sunrise horizon'],
  learning: ['books window light', 'library'],
  daily: ['morning light window', 'coffee sunrise'],
  challenge: ['mountain trail', 'mountain summit sunrise'],
  community: ['friends sunset', 'campfire'],
};
const WORDS: [RegExp, string][] = [
  [/dorm|noche|sats|sueñ/i, 'night sky moon'],
  [/mañana|despert|amanec/i, 'sunrise horizon'],
  [/dinero|riqueza|abundan|negocio/i, 'golden light minimal'],
  [/calma|ansie|respir|estrés/i, 'calm ocean'],
  [/amor|pareja|relaci/i, 'flowers soft light'],
];

/** Respaldo sin IA: palabras del título, luego el tipo de acción dominante, luego el tipo de Moment. */
export function coverQueryByRules(m: CoverInput, pick = Math.random): string {
  const text = `${m.title} ${m.objective ?? ''}`;
  for (const [re, q] of WORDS) if (re.test(text)) return q;
  const types = new Map<string, number>();
  for (const b of m.blocks ?? []) types.set(b.type, (types.get(b.type) ?? 0) + 1);
  const top = [...types.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  for (const t of top) {
    const theme = THEMES.find(([types]) => (types as string[]).includes(t));
    if (theme) return theme[1][Math.floor(pick() * theme[1].length)]!;
  }
  const list = BY_KIND[m.kind ?? ''] ?? ['morning light window'];
  return list[Math.floor(pick() * list.length)]!;
}

/** Un agente elige la escena (2–4 palabras en inglés, sin personas ni texto). Rápido y con tiempo límite. */
async function coverQueryByAI(m: CoverInput): Promise<string | null> {
  try {
    const { object } = await objectWithFallback({
      schema: z.object({ query: z.string().min(3).max(40) }),
      instructions: 'Eliges la foto de portada de un momento de bienestar. Responde una escena aesthetic, serena y luminosa en INGLÉS, de 2 a 4 palabras, que se pueda buscar en un banco de fotos: paisajes, naturaleza, objetos, luz. Sin personas, sin texto, sin marcas. Ejemplos: "misty forest", "journal coffee", "sunrise horizon".',
      prompt: `Título: ${m.title}\nObjetivo: ${m.objective ?? ''}\nTipo: ${m.kind ?? ''}\nAcciones: ${(m.blocks ?? []).map((b) => b.type).join(', ')}`,
      order: FAST_ORDER, timeoutMs: 6000, maxOutputTokens: 60,
    });
    const q = object.query.toLowerCase().replace(/[^a-z\s-]/g, '').trim();
    return q.length >= 3 ? q : null;
  } catch {
    return null;
  }
}

async function getJSON(url: string, headers: Record<string, string> = {}) {
  const res = await fetch(url, { headers: { 'User-Agent': 'SOI-app (covers)', ...headers }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

/** Pexels (con clave): licencia libre, se puede guardar y modificar. */
async function searchPexels(query: string): Promise<Photo[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const d = await getJSON(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=10`, { Authorization: key });
  return ((d.photos ?? []) as { id: number; src: { landscape?: string; medium?: string } }[])
    .map((p) => ({ key: `pexels-${p.id}`, url: p.src.landscape ?? p.src.medium ?? '' })).filter((p) => p.url);
}

/** Openverse (sin clave): solo CC0 y dominio público, fotos horizontales; StockSnap primero (más aesthetic). */
async function searchOpenverse(query: string): Promise<Photo[]> {
  const base = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(query)}&license=cc0,pdm&category=photograph&aspect_ratio=wide&mature=false&page_size=12`;
  const map = (rs: { id: string; source: string; url: string; thumbnail?: string }[]) =>
    rs.map((r) => ({ key: `ov-${r.id.replace(/[^a-z0-9]/gi, '').slice(0, 40).toLowerCase()}`, url: r.source === 'stocksnap' ? r.url : r.thumbnail ?? r.url }));
  const snap = await getJSON(`${base}&source=stocksnap`).catch(() => ({ results: [] }));
  if (snap.results?.length) return map(snap.results);
  const any = await getJSON(base).catch(() => ({ results: [] }));
  return map(any.results ?? []);
}

/** Descarga y reduce a 640×360 WebP (recorte centrado). */
async function optimize(url: string): Promise<Buffer | null> {
  const res = await fetch(url, { headers: { 'User-Agent': 'SOI-app (covers)' }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) return null;
  const len = Number(res.headers.get('content-length') ?? 0);
  if (len > 12 * 1024 * 1024) return null;
  const sharp = (await import('sharp')).default;
  return sharp(Buffer.from(await res.arrayBuffer())).rotate()
    .resize({ width: WIDTH, height: HEIGHT, fit: 'cover', position: 'attention' })
    .webp({ quality: 55, effort: 5 }).toBuffer();
}

/** Busca, optimiza y guarda (o reutiliza) una foto; devuelve la ruta en moment-assets. */
export async function findCover(m: CoverInput): Promise<string | null> {
  const queries = [...new Set([await coverQueryByAI(m), coverQueryByRules(m)].filter(Boolean) as string[])];
  const admin = createAdminClient();
  for (const q of queries) {
    let photos: Photo[] = [];
    try { photos = await searchPexels(q); } catch { /* sin Pexels */ }
    if (!photos.length) { try { photos = await searchOpenverse(q); } catch { /* sin resultados */ } }
    // Entre las primeras, una al azar: variedad sin perder relevancia.
    const pool = photos.slice(0, 6).sort(() => Math.random() - 0.5);
    for (const p of pool.slice(0, 3)) {
      const path = `auto/${p.key}.webp`;
      const { data: exists } = await admin.storage.from('moment-assets').list('auto', { search: `${p.key}.webp`, limit: 1 });
      if (exists?.some((f) => f.name === `${p.key}.webp`)) return path; // ya descargada: se comparte
      try {
        const img = await optimize(p.url);
        if (!img) continue;
        const { error } = await admin.storage.from('moment-assets').upload(path, img, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
        if (!error || /exists|duplicate/i.test(error.message)) return path;
      } catch { /* siguiente foto */ }
    }
  }
  return null;
}

/** Asigna portada a un Moment que aún no tiene. Pensado para `after()`: no retrasa la respuesta. */
export async function autoCover(momentId: string, m: CoverInput) {
  try {
    const path = await findCover(m);
    if (!path) return null;
    await createAdminClient().from('soi_blueprints').update({ cover_path: path }).eq('id', momentId).is('cover_path', null);
    return path;
  } catch (e) {
    console.error('[cover:auto]', e);
    return null;
  }
}

/** Después de responder (Vercel `after`); fuera de una petición (scripts, tests), en segundo plano. */
export function scheduleAutoCover(momentId: string, m: CoverInput) {
  try { after(() => autoCover(momentId, m).then(() => undefined)); } catch { void autoCover(momentId, m); }
}
