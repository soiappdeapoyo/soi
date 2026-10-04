/**
 * Open Library (https://openlibrary.org/developers/api): búsqueda de libros, portadas y descripción.
 * Sin clave. Se identifica con User-Agent como piden sus lineamientos y se cachea en el servidor.
 */
const UA = 'SOI/1.0 (+https://github.com/soiappdeapoyo/soi)';
const BASE = 'https://openlibrary.org';

export type BookResult = { key: string; title: string; author: string | null; year: number | null; coverUrl: string | null };

export function coverFor(coverId: number | null | undefined, size: 'S' | 'M' | 'L' = 'M') {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : null;
}

/** "/works/OL527464W" → válido. Evita que se use para pedir rutas arbitrarias. */
export function isWorkKey(key: string) {
  return /^\/works\/OL\d+W$/.test(key);
}

export async function searchBooks(q: string, limit = 12): Promise<BookResult[]> {
  const params = new URLSearchParams({ q, limit: String(limit), fields: 'key,title,author_name,cover_i,first_publish_year', lang: 'es' });
  const res = await fetch(`${BASE}/search.json?${params}`, { headers: { 'User-Agent': UA }, next: { revalidate: 86_400 }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { docs?: { key: string; title: string; author_name?: string[]; cover_i?: number; first_publish_year?: number }[] };
  return (json.docs ?? []).filter((d) => isWorkKey(d.key)).map((d) => ({
    key: d.key, title: d.title, author: d.author_name?.slice(0, 2).join(', ') ?? null,
    year: d.first_publish_year ?? null, coverUrl: coverFor(d.cover_i),
  }));
}

/** Descripción de la obra (si Open Library la tiene). Sirve de contexto para el resumen. */
export async function workDescription(key: string): Promise<string | null> {
  if (!isWorkKey(key)) return null;
  const res = await fetch(`${BASE}${key}.json`, { headers: { 'User-Agent': UA }, next: { revalidate: 604_800 }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res?.ok) return null;
  const json = (await res.json()) as { description?: string | { value?: string } };
  const d = typeof json.description === 'string' ? json.description : json.description?.value;
  return d ? d.slice(0, 2000) : null;
}
