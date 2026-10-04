import { z } from 'zod/v3';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { detectCrisis } from '@/lib/ai/crisis';
import { hardFilter, MODERATION_COPY } from '@/lib/ai/moderation';
import { getMoment } from '@/lib/moments/server';
import { DM_FIELDS, hydrateMessages, loadMessages, type DmMessage } from '@/lib/social/dm';

const Body = z.object({
  body: z.string().trim().max(2000).optional(),
  postId: z.string().uuid().optional(),
  moment: z.string().min(2).max(60).optional(),
});
const MAX_PER_MINUTE = 20;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  return Response.json(await loadMessages(supabase, user.id, id, new URL(req.url).searchParams.get('antes') ?? undefined));
}

/**
 * Enviar un mensaje. Filtros sin IA (enlaces y ventas); el consentimiento se revisa en cada mensaje
 * (si te bloquean o dejan de seguirte antes de responder, no puedes seguir escribiendo).
 * Señales de crisis: el mensaje se entrega (puede ser alguien buscando apoyo) y quien escribe ve recursos de ayuda.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'community')).allowed) return Response.json({ ok: false, message: 'Los mensajes son parte de SOI+.' }, { status: 402 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Mensaje inválido.' }, { status: 400 });
  const text = parsed.data.body?.trim() || null;
  if (!text && !parsed.data.postId && !parsed.data.moment) return Response.json({ ok: false, message: 'Escribe un mensaje.' }, { status: 400 });

  const { data: thread } = await supabase.from('dm_threads').select('id, user_a, user_b').eq('id', id).maybeSingle();
  if (!thread) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  const other = thread.user_a === user.id ? thread.user_b : thread.user_a;
  const { data: allowed } = await supabase.rpc('can_message', { p_sender: user.id, p_recipient: other });
  if (!allowed) return Response.json({ ok: false, message: 'No puedes enviar mensajes en esta conversación.' }, { status: 403 });

  if (text) {
    const reason = hardFilter(text);
    if (reason) return Response.json({ ok: false, reason, message: MODERATION_COPY[reason] }, { status: 422 });
  }

  const admin = createAdminClient();
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin.from('dm_messages').select('id', { count: 'exact', head: true }).eq('sender_id', user.id).gte('created_at', since);
  if ((count ?? 0) >= MAX_PER_MINUTE) return Response.json({ ok: false, message: 'Vas muy rápido. Espera un momento.' }, { status: 429 });

  let momentCols: { moment_id: string | null; moment_slug: string | null } = { moment_id: null, moment_slug: null };
  if (parsed.data.moment) {
    const m = await getMoment(supabase, parsed.data.moment);
    if (!m) return Response.json({ ok: false, message: 'No encontramos ese Moment.' }, { status: 404 });
    momentCols = m.official ? { moment_id: null, moment_slug: m.slug } : { moment_id: m.id, moment_slug: null };
  }
  if (parsed.data.postId) {
    const { data: p } = await supabase.from('soi_posts').select('id').eq('id', parsed.data.postId).maybeSingle();
    if (!p) return Response.json({ ok: false, message: 'No encontramos esa publicación.' }, { status: 404 });
  }

  const { data, error } = await admin.from('dm_messages').insert({
    thread_id: id, sender_id: user.id, body: text, post_id: parsed.data.postId ?? null, ...momentCols,
  }).select(DM_FIELDS).single();
  if (error) return Response.json({ ok: false, message: 'No se pudo enviar.' }, { status: 500 });
  const preview = text ? text.slice(0, 120) : parsed.data.postId ? 'Compartió una publicación' : 'Compartió un Moment';
  await admin.from('dm_threads').update({ last_message_at: data.created_at, last_message_preview: preview }).eq('id', id);
  await supabase.rpc('mark_dm_read', { p_thread: id });

  const [view] = await hydrateMessages(supabase, user.id, [data as DmMessage]);
  return Response.json({ ok: true, message: view, crisis: text ? detectCrisis(text) : false });
}
