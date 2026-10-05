import { z } from 'zod/v3';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { detectCrisis } from '@/lib/ai/crisis';
import { moderateFields } from '@/lib/social/guard';
import { moderateImage, IMAGE_REASON_COPY } from '@/lib/ai/image-moderation';
import { MODERATION_COPY } from '@/lib/ai/moderation';
import { getMoment } from '@/lib/moments/server';
import { isUserCover, reviewCover } from '@/lib/moments/cover';
import { POST_FIELDS, hydratePosts, type PostRow } from '@/lib/social/posts';

export const maxDuration = 60;

const Body = z.object({
  body: z.string().trim().max(3000).optional(),
  images: z.array(z.string().min(5).max(300)).max(4).default([]),
  moment: z.string().min(2).max(60).optional(),
  quoteOf: z.string().uuid().optional(),
  restackOf: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
});

/**
 * Publicar en Impulso (nota, comentario, cita o restack). Se modera en el servidor y se inserta con service role:
 * el cliente no puede escribir en soi_posts directamente.
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'community')).allowed) return Response.json({ ok: false, message: 'Publicar en Impulso es parte de SOI+.' }, { status: 402 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Revisa tu publicación.' }, { status: 400 });
  const p = parsed.data;
  const text = p.body?.trim() || null;
  const admin = createAdminClient();

  // Restack puro: alterna (compartir / dejar de compartir).
  if (p.restackOf && !text) {
    const { data: existing } = await admin.from('soi_posts').select('id').eq('author_id', user.id).eq('restack_of', p.restackOf).is('body', null).maybeSingle();
    if (existing) {
      await admin.from('soi_posts').delete().eq('id', existing.id);
      return Response.json({ ok: true, restacked: false });
    }
    const { data: target } = await supabase.from('soi_posts').select('id').eq('id', p.restackOf).maybeSingle();
    if (!target) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
    const { error } = await admin.from('soi_posts').insert({ author_id: user.id, restack_of: p.restackOf });
    return Response.json({ ok: !error, restacked: !error });
  }

  if (!text && !p.images.length && !p.moment) return Response.json({ ok: false, message: 'Escribe algo, agrega una imagen o comparte un Moment.' }, { status: 400 });

  // Seguridad primero: señales de crisis no se publican; se redirige al chat con recursos de ayuda.
  if (text && detectCrisis(text)) return Response.json({ ok: false, reason: 'crisis', message: MODERATION_COPY.crisis }, { status: 422 });
  if (text) {
    const blocked = await moderateFields([text]);
    if (blocked) return blocked;
  }

  // Imágenes: solo de la carpeta propia en post-media; moderadas con visión (falla en cerrado).
  for (const path of p.images) {
    if (!path.startsWith(`${user.id}/`)) return Response.json({ ok: false, message: 'Imagen inválida.' }, { status: 400 });
    const { data: file, error } = await admin.storage.from('post-media').download(path);
    if (error || !file) return Response.json({ ok: false, message: 'No encontramos una de tus imágenes. Súbela de nuevo.' }, { status: 400 });
    const verdict = await moderateImage(new Uint8Array(await file.arrayBuffer()), file.type || 'image/webp');
    if (!verdict) return Response.json({ ok: false, message: 'No pudimos revisar tus imágenes ahora. Intenta de nuevo en un momento.' }, { status: 503 });
    if (!verdict.allowed) {
      await admin.storage.from('post-media').remove(p.images);
      return Response.json({ ok: false, reason: verdict.reason, message: IMAGE_REASON_COPY[verdict.reason] }, { status: 422 });
    }
  }

  // Moment adjunto: debe ser visible para quien publica (publicado, oficial o propio).
  let momentCols: { moment_id: string | null; moment_slug: string | null } = { moment_id: null, moment_slug: null };
  if (p.moment) {
    const m = await getMoment(supabase, p.moment);
    if (!m || m.status === 'archived') return Response.json({ ok: false, message: 'No encontramos ese Moment.' }, { status: 404 });
    momentCols = m.official ? { moment_id: null, moment_slug: m.slug } : { moment_id: m.id, moment_slug: null };
    if (!m.official && m.status !== 'published' && m.creator_id === user.id) {
      const { data: cov } = await supabase.from('soi_blueprints').select('cover_path').eq('id', m.id).maybeSingle();
      if (isUserCover(cov?.cover_path as string | null)) {
        const review = await reviewCover(cov!.cover_path as string);
        if (review.status === 'unavailable') return Response.json({ ok: false, message: 'No pudimos revisar la portada del Moment. Intenta de nuevo en un momento.' }, { status: 503 });
        if (review.status === 'blocked') {
          await admin.from('soi_blueprints').update({ cover_path: null }).eq('id', m.id);
          return Response.json({ ok: false, message: review.message }, { status: 422 });
        }
      }
    }
  }

  let root_id: string | null = null;
  if (p.parentId) {
    const { data: parent } = await supabase.from('soi_posts').select('id, root_id').eq('id', p.parentId).maybeSingle();
    if (!parent) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
    root_id = (parent.root_id as string | null) ?? (parent.id as string);
  }
  if (p.quoteOf) {
    const { data: q } = await supabase.from('soi_posts').select('id').eq('id', p.quoteOf).maybeSingle();
    if (!q) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  }

  const { data, error } = await admin.from('soi_posts').insert({
    author_id: user.id, body: text, images: p.images, ...momentCols,
    quote_of: p.quoteOf ?? null, parent_id: p.parentId ?? null, root_id,
  }).select(POST_FIELDS).single();
  if (error) return Response.json({ ok: false, message: 'No se pudo publicar.' }, { status: 500 });
  const [view] = await hydratePosts(supabase, user.id, [data as PostRow]);
  return Response.json({ ok: true, post: view });
}
