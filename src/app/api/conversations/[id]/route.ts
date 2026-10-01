import { getSessionUser } from '@/lib/supabase/server';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const body = (await req.json()) as { title?: string; is_pinned?: boolean; is_archived?: boolean };
  const patch = Object.fromEntries(
    Object.entries({ title: body.title?.slice(0, 80), is_pinned: body.is_pinned, is_archived: body.is_archived })
      .filter(([, v]) => v !== undefined),
  );
  const { error } = await supabase.from('conversations').update(patch).eq('id', id).eq('user_id', user.id);
  return Response.json({ ok: !error });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  // Archivar en lugar de borrar: nunca romper la memoria del usuario.
  const { error } = await supabase.from('conversations').update({ is_archived: true }).eq('id', id).eq('user_id', user.id);
  return Response.json({ ok: !error });
}
