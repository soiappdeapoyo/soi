import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';

const Patch = z.object({ status: z.enum(['saved', 'want', 'reading', 'done']).optional(), notes: z.string().max(2000).optional() });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const { error } = await supabase.from('library_items').update({ ...parsed.data, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id);
  return Response.json({ ok: !error });
}

/** Quitar de la biblioteca (y borrar el PDF si lo había). */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { data: item } = await supabase.from('library_items').select('file_path').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!item) return Response.json({ ok: false }, { status: 404 });
  if (item.file_path) await supabase.storage.from('library').remove([item.file_path as string]);
  const { error } = await supabase.from('library_items').delete().eq('id', id).eq('user_id', user.id);
  return Response.json({ ok: !error });
}
