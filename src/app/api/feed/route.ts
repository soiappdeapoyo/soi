import { getSessionUser } from '@/lib/supabase/server';
import { loadForYou, loadFollowing, loadByAuthor } from '@/lib/social/posts';

/** Páginas siguientes del feed (Para ti por desplazamiento; Siguiendo y perfiles por fecha). */
export async function GET(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const u = new URL(req.url);
  const vista = u.searchParams.get('vista');
  const author = u.searchParams.get('autor');
  if (author) return Response.json(await loadByAuthor(supabase, user.id, author, u.searchParams.get('antes') ?? undefined));
  if (vista === 'siguiendo') return Response.json(await loadFollowing(supabase, user.id, u.searchParams.get('antes') ?? undefined));
  return Response.json(await loadForYou(supabase, user.id, Number(u.searchParams.get('offset') ?? 0)));
}
