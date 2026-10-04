import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { getMoment, enroll, getEnrollment } from '@/lib/moments/server';

const Body = z.object({ moment: z.string().min(2).max(60), action: z.enum(['join', 'leave']).default('join') });

/** Unirse a un reto (o dejarlo, conservando el progreso). */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const m = await getMoment(supabase, parsed.data.moment);
  if (!m || m.kind !== 'challenge') return Response.json({ ok: false, message: 'Este Moment no es un reto.' }, { status: 400 });
  if (parsed.data.action === 'leave') {
    const e = await getEnrollment(supabase, user.id, m);
    if (e) await supabase.from('challenge_enrollments').update({ status: 'left' }).eq('id', e.id);
    return Response.json({ ok: true });
  }
  const e = await enroll(supabase, user.id, m);
  return Response.json({ ok: Boolean(e), enrollment: e });
}
