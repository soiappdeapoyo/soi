import { getSessionUser } from '@/lib/supabase/server';

export async function POST() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { error } = await supabase.rpc('mark_notifications_read');
  return Response.json({ ok: !error });
}
