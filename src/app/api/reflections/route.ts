import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { recordMomentum } from '@/lib/momentum-server';
import { remember } from '@/lib/ai/rag';
import { REFLECTION_QUESTION } from '@/lib/momentum';

const Body = z.object({
  reflection: z.string().trim().min(3).max(1000),
  videoId: z.string().min(3).max(32).optional(),
  title: z.string().trim().max(200),
  channel: z.string().trim().max(120).optional(),
});

/**
 * Reflexión después de un video: la respuesta no es conversación, es conocimiento estructurado.
 * Se guarda como Moment privado (fuente: el video) y en la memoria transversal.
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Escribe al menos una idea corta.' }, { status: 400 });
  const r = parsed.data;

  const profile = await getProfile(user.id);
  const reference = [r.title, r.channel].filter(Boolean).join(' · ').slice(0, 200);
  const { data, error } = await supabase.from('soi_moments').insert({
    creator_id: user.id, author_name: profile?.display_name ?? null,
    title: `Idea de «${r.title.slice(0, 100)}»`.slice(0, 120), category: 'pensamiento',
    source_type: 'video', source_reference: reference, insight: r.reflection,
    reflection_question: REFLECTION_QUESTION, user_reflection: r.reflection, visibility: 'private',
  }).select('id').single();
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar tu reflexión.' }, { status: 500 });

  await remember(supabase, {
    user_id: user.id, category: 'pensamiento', title: `Idea de ${r.title}`.slice(0, 120), content: r.reflection,
    tags: ['insight', 'moment', 'video'], metadata: { eslabon_soi: 'pensamiento', moment_id: data.id, video_id: r.videoId ?? null },
  });
  await recordMomentum(supabase, user.id, 'reflection', { eslabon: 'pensamiento', metadata: { moment_id: data.id, video_id: r.videoId ?? null } });
  return Response.json({ ok: true, id: data.id });
}
