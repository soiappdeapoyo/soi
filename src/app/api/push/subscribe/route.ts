import { getSessionUser } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const sub = await req.json();
  if (!sub?.endpoint) return new Response('Suscripción inválida', { status: 400 });
  const { error } = await supabase.from('user_profiles').update({ push_subscription: sub }).eq('user_id', user.id);
  return Response.json({ ok: !error });
}

export async function DELETE() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  await supabase.from('user_profiles').update({ push_subscription: null }).eq('user_id', user.id);
  return Response.json({ ok: true });
}
