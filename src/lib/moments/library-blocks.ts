import { createAdminClient } from '@/lib/supabase/server';
import { exerciseSeconds, type ActionBlock } from '@/config/actions';
import { allExercises, filterExercises } from '@/lib/library/exercises';
import { searchBooks } from '@/lib/library/openlibrary';
import { searchYouTube } from '@/lib/integrations/youtube';
import type { Exercise } from '@/lib/library/exercises';

/** Palabras del estiramiento (en español) → músculo de free-exercise-db (ya traducido en MUSCLE_ES). */
const BODY: [RegExp, string][] = [
  [/cuello|cervical/, 'Cuello'], [/trapecio/, 'Trapecios'], [/hombro/, 'Hombros'],
  [/espalda baja|lumbar/, 'Espalda baja'], [/espalda|columna|dorsal/, 'Espalda media'],
  [/pecho|pectoral/, 'Pecho'], [/tr[ií]ceps|brazo/, 'Tríceps'], [/b[ií]ceps/, 'Bíceps'], [/antebrazo|mu[ñn]eca/, 'Antebrazos'],
  [/abdom|torso|core|costado|lateral/, 'Abdomen'], [/isquio|femoral|posterior|tocar.*pies|punta.*pies/, 'Isquiotibiales'],
  [/cu[aá]driceps|muslo/, 'Cuádriceps'], [/gl[uú]te/, 'Glúteos'], [/cadera|aductor|mariposa|ingle/, 'Aductores'],
  [/pantorrilla|gemelo|tobillo/, 'Pantorrillas'],
];

const norm = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/** Animación de estiramiento para un texto como "Cuello: inclina a cada lado". Varía entre candidatos. */
export function stretchFor(item: string, stretches: Exercise[], i = 0): string[] | null {
  const text = norm(item);
  const hit = BODY.find(([re]) => re.test(text) || re.test(item.toLowerCase()));
  if (!hit) return null;
  const candidates = stretches.filter((e) => e.muscles.includes(hit[1]) && e.frames.length);
  const pick = candidates[i % Math.max(1, candidates.length)];
  return pick ? pick.frames.slice(0, 2) : null;
}

/** Short de YouTube (caché global en content_cache: una búsqueda por texto para todas las personas). */
async function shortFor(query: string): Promise<string | null> {
  const admin = createAdminClient();
  const key = `yt:short:${norm(query).slice(0, 160)}`;
  const { data } = await admin.from('content_cache').select('value').eq('key', key).maybeSingle();
  if (data) return ((data.value as { id?: string | null }).id) ?? null;
  const v = (await searchYouTube(query, 1, { short: true }).catch(() => []))[0];
  await admin.from('content_cache').upsert({ key, value: { id: v?.id ?? null } });
  return v?.id ?? null;
}

/**
 * Libros y ejercicios que diseña la IA llegan por nombre (no conoce los ids):
 * ejercicio `query` → ejercicio concreto de free-exercise-db (id + animación);
 * libro sin `key` → obra de Open Library (clave, portada y autor). Si no hay resultado, el bloque queda como está.
 */
export async function resolveLibraryBlocks(blocks: ActionBlock[], opts: { youtube?: boolean } = {}): Promise<ActionBlock[]> {
  const needsExercises = blocks.some((b) => (b.type === 'exercise' && !(b.config as { exerciseId?: string }).exerciseId)
    || (b.type === 'stretching' && !(b.config as { guides?: unknown[] }).guides));
  const exercises = needsExercises ? await allExercises() : [];
  return Promise.all(blocks.map(async (b) => {
    if (b.type === 'exercise') {
      const c = b.config as { exerciseId?: string; query?: string; name?: string; frames?: string[] };
      if (c.exerciseId || (c as { videoId?: string }).videoId) return b;
      const hit = filterExercises(exercises, { q: c.query ?? c.name ?? '', limit: 1 })[0];
      if (!hit) {
        // Sin animación en la librería: un Short que muestre el movimiento.
        const videoId = opts.youtube ? await shortFor(`${c.name ?? c.query} cómo hacer ejercicio`) : null;
        return videoId ? { ...b, config: { ...c, videoId } } : b;
      }
      const config = { ...c, exerciseId: hit.id, frames: hit.frames.slice(0, 2), query: undefined };
      const secs = exerciseSeconds(config as never);
      return { ...b, config, minutes: Math.max(1, Math.round(secs / 60)), seconds: secs };
    }
    if (b.type === 'stretching') {
      const c = b.config as { sequence: string[]; guides?: unknown[] };
      if (c.guides) return b;
      const stretches = exercises.filter((e) => e.kind === 'estiramiento');
      const guides = await Promise.all(c.sequence.map(async (item, i) => {
        const frames = stretchFor(item, stretches, i);
        if (frames) return { frames };
        const videoId = opts.youtube ? await shortFor(`${item} estiramiento`) : null;
        return videoId ? { videoId } : {};
      }));
      return { ...b, config: { ...c, guides } };
    }
    if (b.type === 'book') {
      const c = b.config as { key?: string; title: string; author?: string };
      if (c.key) return b;
      const hit = (await searchBooks(`${c.title} ${c.author ?? ''}`.trim(), 1).catch(() => []))[0];
      if (!hit) return b;
      return { ...b, config: { ...c, key: hit.key, author: c.author ?? hit.author ?? undefined, ...(hit.coverUrl ? { cover: hit.coverUrl } : {}) } };
    }
    return b;
  }));
}

/**
 * Al publicar: los documentos que vienen de la biblioteca privada se copian a moment-assets
 * (para que otras personas puedan abrirlos). La biblioteca sigue siendo privada.
 */
export async function publishDocuments(userId: string, blocks: ActionBlock[]): Promise<{ blocks: ActionBlock[]; changed: boolean; error?: string }> {
  if (!blocks.some((b) => b.type === 'document' && (b.config as { itemId?: string }).itemId)) return { blocks, changed: false };
  const admin = createAdminClient();
  const out: ActionBlock[] = [];
  for (const b of blocks) {
    const c = b.config as { itemId?: string; title: string; prompt?: string };
    if (b.type !== 'document' || !c.itemId) { out.push(b); continue; }
    const { data: item } = await admin.from('library_items').select('file_path').eq('id', c.itemId).eq('user_id', userId).eq('kind', 'pdf').maybeSingle();
    if (!item?.file_path) return { blocks, changed: false, error: `No encontramos el PDF «${c.title}» en tu biblioteca.` };
    const { data: file, error } = await admin.storage.from('library').download(item.file_path as string);
    if (error || !file) return { blocks, changed: false, error: `No pudimos copiar «${c.title}».` };
    const path = `${userId}/docs/${crypto.randomUUID()}.pdf`;
    const up = await admin.storage.from('moment-assets').upload(path, file, { contentType: 'application/pdf', upsert: false });
    if (up.error) return { blocks, changed: false, error: `No pudimos copiar «${c.title}».` };
    out.push({ ...b, config: { title: c.title, assetPath: path, ...(c.prompt ? { prompt: c.prompt } : {}) } });
  }
  return { blocks: out, changed: true };
}

/** Un documento solo puede venir de la biblioteca de quien crea el Moment. */
export async function ownsDocuments(userId: string, blocks: ActionBlock[]) {
  const ids = blocks.filter((b) => b.type === 'document').map((b) => (b.config as { itemId?: string }).itemId).filter(Boolean) as string[];
  const paths = blocks.filter((b) => b.type === 'document').map((b) => (b.config as { assetPath?: string }).assetPath).filter(Boolean) as string[];
  if (paths.some((p) => !p.startsWith(`${userId}/`))) return false;
  if (!ids.length) return true;
  const { data } = await createAdminClient().from('library_items').select('id').eq('user_id', userId).in('id', ids);
  return (data ?? []).length === new Set(ids).size;
}
