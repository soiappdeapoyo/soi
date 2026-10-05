import { createAdminClient } from '@/lib/supabase/server';
import { exerciseSeconds, type ActionBlock } from '@/config/actions';
import { allExercises, filterExercises } from '@/lib/library/exercises';
import { searchBooks } from '@/lib/library/openlibrary';

/**
 * Libros y ejercicios que diseña la IA llegan por nombre (no conoce los ids):
 * ejercicio `query` → ejercicio concreto de free-exercise-db (id + animación);
 * libro sin `key` → obra de Open Library (clave, portada y autor). Si no hay resultado, el bloque queda como está.
 */
export async function resolveLibraryBlocks(blocks: ActionBlock[]): Promise<ActionBlock[]> {
  const needsExercises = blocks.some((b) => b.type === 'exercise' && !(b.config as { exerciseId?: string }).exerciseId);
  const exercises = needsExercises ? await allExercises() : [];
  return Promise.all(blocks.map(async (b) => {
    if (b.type === 'exercise') {
      const c = b.config as { exerciseId?: string; query?: string; name?: string; frames?: string[] };
      if (c.exerciseId) return b;
      const hit = filterExercises(exercises, { q: c.query ?? c.name ?? '', limit: 1 })[0];
      if (!hit) return b;
      const config = { ...c, exerciseId: hit.id, frames: hit.frames.slice(0, 2), query: undefined };
      const secs = exerciseSeconds(config as never);
      return { ...b, config, minutes: Math.max(1, Math.round(secs / 60)), seconds: secs };
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
