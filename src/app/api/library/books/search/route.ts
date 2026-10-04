import { getSessionUser } from '@/lib/supabase/server';
import { searchBooks } from '@/lib/library/openlibrary';

export async function GET(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 120);
  if (q.length < 2) return Response.json({ books: [] });
  return Response.json({ books: await searchBooks(q) });
}
