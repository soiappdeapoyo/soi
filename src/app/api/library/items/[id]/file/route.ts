import { getSessionUser } from '@/lib/supabase/server';

/** Abre un PDF propio con una URL firmada de corta duración (el bucket es privado). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { data: item } = await supabase.from('library_items').select('file_path').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!item?.file_path) return new Response('No encontrado', { status: 404 });
  const { data } = await supabase.storage.from('library').createSignedUrl(item.file_path as string, 600);
  if (!data?.signedUrl) return new Response('No disponible', { status: 404 });
  // ?json=1: el reproductor de Moments necesita la URL para mostrar el PDF dentro de la app.
  if (new URL(req.url).searchParams.get('json')) return Response.json({ url: data.signedUrl });
  return Response.redirect(data.signedUrl, 302);
}
