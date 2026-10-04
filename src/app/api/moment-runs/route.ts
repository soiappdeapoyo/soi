import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { getMoment, canRun } from '@/lib/moments/server';

const Body = z.object({ moment: z.string().min(2).max(60), moodBefore: z.number().int().min(1).max(5).optional(), challengeDay: z.number().int().min(1).max(365).optional() });

/** Empezar una ejecución (ánimo antes). */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const m = await getMoment(supabase, parsed.data.moment);
  if (!m) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  const access = await canAccess(user.id, 'routine_execution');
  if (!(await canRun(supabase, user.id, m, access.allowed))) {
    const premium = !m.official && m.tier === 'premium' && m.creator_id !== user.id;
    return Response.json({ ok: false, message: premium ? 'Este Moment es premium: obténlo para vivirlo.' : 'Ejecutar Moments es parte de SOI+.' }, { status: 402 });
  }
  const { data, error } = await supabase.from('moment_runs').insert({
    user_id: user.id, moment_id: m.official ? null : m.id, moment_slug: m.official ? m.slug : null,
    version: m.version, mood_before: parsed.data.moodBefore ?? null, outputs: {}, challenge_day: parsed.data.challengeDay ?? null,
  }).select('id').single();
  if (error) return Response.json({ ok: false, message: 'No se pudo empezar.' }, { status: 500 });
  return Response.json({ ok: true, id: data.id });
}
