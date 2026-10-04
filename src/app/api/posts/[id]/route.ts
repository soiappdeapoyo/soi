import { getSessionUser, createAdminClient } from '@/lib/supabase/server';

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
