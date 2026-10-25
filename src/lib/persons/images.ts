import { after } from 'next/server';
import { generateImage } from 'ai';
import { google } from '@ai-sdk/google';
import { createAdminClient } from '@/lib/supabase/server';
import { hasKey } from '@/lib/ai/models';
import { moderateImage } from '@/lib/ai/image-moderation';
import { optimize, searchFreePhotos } from '@/lib/moments/auto-cover';
import type { PersonSpec } from './spec';

/**
 * Fotos de /persons.
 * - Foto de perfil: generada con IA (Gemini, `AI_MODEL_IMAGE`): una persona ficticia, adulta, en una foto casual de
 *   teléfono. Si no hay IA, una foto libre de derechos (Pexels / Openverse CC0) SIN personas, de algo que le gusta,
 *   como tanta gente tiene en su perfil. Nunca la cara de una persona real.
 * - Fotos en el chat: lo que el personaje está viendo o haciendo (paisaje, comida, su café), siempre libres de
 *   derechos y sin personas; se comparten entre chats (mismo archivo).
 * Todo en el bucket público moment-assets: las de perfil en `<user_id>/persons/` (se borran con la cuenta).
 */

const BUCKET = 'moment-assets';
const IMAGE_MODEL = () => process.env.AI_MODEL_IMAGE || 'gemini-2.5-flash-image';
const AVATAR = 384;
/** Si falló, se vuelve a intentar al día siguiente (no en cada visita). */
const RETRY_MS = 24 * 3_600_000;

export function personsImageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

const WHO: Record<string, string> = { femenino: 'woman', masculino: 'man', no_binario: 'androgynous person' };

/** Escena en inglés para la foto de perfil (o, de respaldo, para la foto sin personas) a partir de sus intereses. */
const INTEREST_SCENES: [RegExp, string][] = [
  [/sender|monta|hik|trek|escal/i, 'mountain trail'],
  [/playa|surf|mar\b|nadar/i, 'beach sunset'],
  [/caf[eé]/i, 'coffee cup window'],
  [/cine|pel[ií]cul/i, 'cinema seats'],
  [/m[uú]sic|guitarr|concierto|vinil/i, 'guitar warm light'],
  [/libro|leer|lectur|poes/i, 'books coffee'],
  [/foto/i, 'film camera'],
  [/cocin|comida|gastro|reposter/i, 'homemade food table'],
  [/perro|gato|mascota/i, 'dog portrait'],
  [/correr|running|marat|gym|gimnas|fut|bici|ciclis|yoga/i, 'running shoes road'],
  [/arte|pint|dibuj|dise/i, 'art studio paint'],
  [/viaj/i, 'travel window plane'],
  [/plant|jard/i, 'plants window light'],
  [/videojue|gamer|juego/i, 'game controller neon'],
];

export function sceneFor(spec: Pick<PersonSpec, 'interests'>): string {
  for (const i of spec.interests) for (const [re, scene] of INTEREST_SCENES) if (re.test(i)) return scene;
  return 'city street golden hour';
}

export function avatarPrompt(spec: Pick<PersonSpec, 'age' | 'gender' | 'profession' | 'city' | 'interests' | 'traits'>) {
  return [
    `Casual smartphone profile picture for a messaging app of a fictional adult ${WHO[spec.gender] ?? 'person'}, ${Math.max(18, spec.age)} years old,`,
    `who works as ${spec.profession} and lives in ${spec.city}. Personality: ${spec.traits.slice(0, 3).join(', ')}.`,
    `Background hints at ${spec.interests.slice(0, 2).join(' and ') || 'everyday life'}.`,
    'Realistic photo, natural light, candid, slightly imperfect phone framing, head and shoulders, fully clothed, everyday look.',
    'Not a celebrity, not a model shoot, no text, no watermark, no logos, no filters.',
  ].join(' ');
}

async function aiAvatar(spec: PersonSpec): Promise<Buffer | null> {
  if (!hasKey('gemini')) return null;
  const { image } = await generateImage({
    model: google.image(IMAGE_MODEL()),
    prompt: avatarPrompt(spec),
    aspectRatio: '1:1',
    abortSignal: AbortSignal.timeout(45_000),
    maxRetries: 1,
  });
  const sharp = (await import('sharp')).default;
  const out = await sharp(Buffer.from(image.uint8Array)).resize({ width: AVATAR, height: AVATAR, fit: 'cover', position: 'attention' }).webp({ quality: 72 }).toBuffer();
  // La generación ya tiene filtros; una segunda mirada evita sorpresas (si la revisión no responde, se usa).
  const verdict = await moderateImage(new Uint8Array(out), 'image/webp').catch(() => null);
  return verdict && !verdict.allowed ? null : out;
}

async function webAvatar(spec: PersonSpec): Promise<Buffer | null> {
  const photos = await searchFreePhotos(`${sceneFor(spec)} no people`, 'square').catch(() => []);
  for (const p of photos.slice(0, 4)) {
    const img = await optimize(p.url, AVATAR, AVATAR).catch(() => null);
    if (img) return img;
  }
  return null;
}

type AvatarTarget = { id: string; user_id: string; spec: PersonSpec; avatar_path?: string | null; avatar_at?: string | null };

/** ¿Hace falta (o se puede volver a intentar) la foto de perfil? */
export function needsAvatar(p: AvatarTarget, now = Date.now()) {
  if (p.avatar_path) return false;
  return !p.avatar_at || now - Date.parse(p.avatar_at) > RETRY_MS;
}

/** Genera y guarda la foto de perfil. Nunca lanza: sin foto, el avatar ilustrado sigue ahí. */
export async function ensureAvatar(p: AvatarTarget): Promise<string | null> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();
  // Se marca antes: dos visitas seguidas no generan dos fotos.
  const { data: claimed } = await db.from('personas').update({ avatar_at: nowIso }).eq('id', p.id).is('avatar_path', null)
    .or(`avatar_at.is.null,avatar_at.lt.${new Date(Date.now() - RETRY_MS).toISOString()}`).select('id');
  if (!claimed?.length) return null;
  try {
    let source: 'ai' | 'web' = 'ai';
    let img = await aiAvatar(p.spec).catch((e: unknown) => { console.error('[persons] foto IA', e instanceof Error ? e.message : e); return null; });
    if (!img) { source = 'web'; img = await webAvatar(p.spec); }
    if (!img) { await db.from('personas').update({ avatar_source: 'none' }).eq('id', p.id); return null; }
    const path = `${p.user_id}/persons/${p.id}-${Date.now().toString(36)}.webp`;
    const { error } = await db.storage.from(BUCKET).upload(path, img, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
    if (error) throw new Error(error.message);
    await db.from('personas').update({ avatar_path: path, avatar_source: source }).eq('id', p.id);
    return path;
  } catch (e) {
    console.error('[persons] foto de perfil', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Después de responder (la creación no espera a la foto). */
export function scheduleAvatar(p: AvatarTarget) {
  if (!needsAvatar(p)) return;
  try { after(() => ensureAvatar(p).then(() => undefined)); } catch { void ensureAvatar(p); }
}

/** Una foto libre de derechos y sin personas de lo que está viendo (`query` en inglés). Devuelve la ruta. */
export async function findChatPhoto(query: string): Promise<string | null> {
  const q = query.toLowerCase().replace(/[^a-z\s-]/g, '').trim().slice(0, 40);
  if (q.length < 3) return null;
  const db = createAdminClient();
  const photos = await searchFreePhotos(q, 'square').catch(() => []);
  for (const p of photos.slice(0, 5).sort(() => Math.random() - 0.5).slice(0, 3)) {
    const path = `persons/photos/${p.key}.webp`;
    const { data: exists } = await db.storage.from(BUCKET).list('persons/photos', { search: `${p.key}.webp`, limit: 1 });
    if (exists?.some((f) => f.name === `${p.key}.webp`)) return path;
    try {
      const img = await optimize(p.url, 720, 720);
      if (!img) continue;
      const { error } = await db.storage.from(BUCKET).upload(path, img, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
      if (!error || /exists|duplicate/i.test(error.message)) return path;
    } catch { /* la siguiente */ }
  }
  return null;
}

/**
 * Manda la foto un poco antes de su primera burbuja (como quien la manda y luego escribe). Si para cuando la encontró
 * ya llegaron sus mensajes, llega justo ahora. Pensado para `after()`.
 */
export async function sendChatPhoto(o: { personaId: string; userId: string; query: string; caption: string | null; deliverAt: Date }) {
  try {
    const path = await findChatPhoto(o.query);
    if (!path) return;
    const at = Math.max(Date.now() + 1500, o.deliverAt.getTime() - 4000);
    await createAdminClient().from('persona_messages').insert({
      persona_id: o.personaId, user_id: o.userId, role: 'persona', kind: 'text',
      content: (o.caption?.trim() || '📷 Foto').slice(0, 300), deliver_at: new Date(at).toISOString(),
      meta: { photo: path, caption: Boolean(o.caption?.trim()) },
    });
  } catch (e) {
    console.error('[persons] foto en el chat', e instanceof Error ? e.message : e);
  }
}

export function scheduleChatPhoto(o: Parameters<typeof sendChatPhoto>[0]) {
  try { after(() => sendChatPhoto(o)); } catch { void sendChatPhoto(o); }
}
