import { z } from 'zod/v3';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { loadInbox } from '@/lib/social/dm';

const Body = z.object({ userId: z.string().uuid() });
const MAX_NEW_THREADS_PER_DAY = 20;

/**
 * Abrir (o recuperar) una conversación 1 a 1. Consentimiento: la otra persona te sigue,
 * o ya te respondió antes. Sin bloqueos. Límite de conversaciones nuevas por día (anti-spam).
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'community')).allowed) return Response.json({ ok: false, message: 'Los mensajes son parte de SOI+.' }, { status: 402 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success || parsed.data.userId === user.id) return new Response('Datos inválidos', { status: 400 });
  const other = parsed.data.userId;
  const [a, b] = [user.id, other].sort();
  const admin = createAdminClient();

  const { data: existing } = await admin.from('dm_threads').select('id').eq('user_a', a).eq('user_b', b).maybeSingle();
  if (existing) return Response.json({ ok: true, id: existing.id });

  const { data: allowed } = await supabase.rpc('can_message', { p_sender: user.id, p_recipient: other });
  if (!allowed) return Response.json({ ok: false, message: 'Solo puedes escribirle a quien te sigue.' }, { status: 403 });

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from('dm_threads').select('id', { count: 'exact', head: true }).eq('created_by', user.id).gte('created_at', since);
  if ((count ?? 0) >= MAX_NEW_THREADS_PER_DAY) return Response.json({ ok: false, message: 'Abriste muchas conversaciones hoy. Intenta mañana.' }, { status: 429 });

  const { data, error } = await admin.from('dm_threads').insert({ user_a: a, user_b: b, created_by: user.id }).select('id').single();
  if (error) return Response.json({ ok: false, message: 'No se pudo abrir la conversación.' }, { status: 500 });
  return Response.json({ ok: true, id: data.id });
}

/** Bandeja de entrada (para compartir por mensaje y para la lista). */
export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  return Response.json({ threads: await loadInbox(supabase, user.id) });
}
