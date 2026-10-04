import { z } from 'zod/v3';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';
import { detectCrisis } from '@/lib/ai/crisis';
import { MODERATION_COPY } from '@/lib/ai/moderation';
import { moderateFields } from '@/lib/social/guard';

const Patch = z.object({
  body: z.string().trim().max(3000),
  removeImages: z.array(z.string().max(300)).max(4).default([]),
});

/**
 * Editar una publicación propia (texto y quitar imágenes). Se vuelve a moderar; la versión anterior
 * queda en post_revisions (solo visible para su autor y para moderación) y se marca "editado".
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Revisa tu publicación.' }, { status: 400 });

  const { data: post } = await supabase.from('soi_posts').select('id, body, images, moment_id, moment_slug, restack_of')
    .eq('id', id).eq('author_id', user.id).maybeSingle();
  if (!post) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  if (post.restack_of && !post.body) return Response.json({ ok: false, message: 'Un restack no se puede editar.' }, { status: 400 });

  const text = parsed.data.body || null;
  const images = (post.images as string[]).filter((i) => !parsed.data.removeImages.includes(i));
  if (!text && !images.length && !post.moment_id && !post.moment_slug && !post.restack_of) {
    return Response.json({ ok: false, message: 'La publicación no puede quedar vacía. Si prefieres, elimínala.' }, { status: 400 });
  }
  if (text && text !== post.body) {
    if (detectCrisis(text)) return Response.json({ ok: false, reason: 'crisis', message: MODERATION_COPY.crisis }, { status: 422 });
    const blocked = await moderateFields([text]);
    if (blocked) return blocked;
  }

  const admin = createAdminClient();
  await admin.from('post_revisions').insert({ post_id: id, body: post.body, images: post.images });
  const editedAt = new Date().toISOString();
  const { error } = await admin.from('soi_posts').update({ body: text, images, edited_at: editedAt }).eq('id', id).eq('author_id', user.id);
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar.' }, { status: 500 });
  const removed = (post.images as string[]).filter((i) => !images.includes(i));
  if (removed.length) await admin.storage.from('post-media').remove(removed);
  return Response.json({ ok: true, body: text, images, edited_at: editedAt });
}

/** Borrar una publicación propia (y sus imágenes). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { data: post } = await supabase.from('soi_posts').select('images').eq('id', id).eq('author_id', user.id).maybeSingle();
  if (!post) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  const { error } = await supabase.from('soi_posts').delete().eq('id', id).eq('author_id', user.id);
  if (!error && (post.images as string[]).length) await createAdminClient().storage.from('post-media').remove(post.images as string[]);
  return Response.json({ ok: !error });
}
