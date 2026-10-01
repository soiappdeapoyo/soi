import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, getProfile } from '@/lib/billing/check-access';
import { moderatePost } from '@/lib/ai/moderation';

const Body = z.object({
  type: z.enum(['evidencia', 'peticion', 'testimonio', 'pregunta']),
  content: z.string().min(5).max(1000),
  isAnonymous: z.boolean().default(false),
});

const REASON_COPY: Record<string, string> = {
  link: 'En la comunidad no se permiten enlaces externos.',
  venta: 'En la comunidad no se permiten ventas ni autopromoción.',
  consejo_medico: 'No compartimos consejos médicos. Consulta a un profesional de salud.',
  crisis: 'Notamos que puedes estar pasando por un momento difícil. Escríbele a SOI en el chat: ahí tienes líneas de ayuda.',
};

export async function GET(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'community')).allowed) return new Response('SOI+ requerido', { status: 402 });
  const before = new URL(req.url).searchParams.get('before');
  let q = supabase.from('community_posts')
    .select('id, user_id, type, content, is_anonymous, author_name, reactions, is_demo, created_at')
    .eq('is_public', true).eq('flagged', false)
    .order('created_at', { ascending: false }).limit(20);
  if (before) q = q.lt('created_at', before);
  const { data } = await q;
  return Response.json({ posts: data ?? [] });
}

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'community')).allowed) return new Response('SOI+ requerido', { status: 402 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });

  const mod = await moderatePost(parsed.data.content);
  if (!mod.allowed) {
    return Response.json({ ok: false, reason: mod.reason, message: REASON_COPY[mod.reason] ?? 'Tu publicación no cumple las reglas de la comunidad.' }, { status: 422 });
  }

  const profile = await getProfile(user.id);
  const { data, error } = await supabase.from('community_posts').insert({
    user_id: user.id,
    type: parsed.data.type,
    content: parsed.data.content,
    is_anonymous: parsed.data.isAnonymous,
    author_name: parsed.data.isAnonymous ? null : (profile?.display_name ?? 'Alguien de SOI'),
    moderated: true,
  }).select('*').single();

  if (error) return Response.json({ ok: false, message: error.message }, { status: 500 });
  return Response.json({ ok: true, post: data });
}
