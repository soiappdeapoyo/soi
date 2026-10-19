import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { REFLECTION_QUESTION } from '@/lib/momentum';
import { saveLearning } from '@/lib/learning-server';
import { todayISO } from '@/lib/utils';

const Body = z.object({
  reflection: z.string().trim().min(3).max(600),
  meaning: z.string().trim().max(600).optional(),
  action: z.string().trim().max(200).optional(),
  measure: z.string().trim().max(200).optional(),
  videoId: z.string().min(3).max(32).optional(),
  title: z.string().trim().max(200),
  channel: z.string().trim().max(120).optional(),
});

/**
 * Reflexión después de un video: la respuesta no es conversación, es conocimiento estructurado.
 * Se guarda como Idea privada (fuente: el video) y como aprendizaje (las 4 preguntas): si hay acción, SOI
 * pregunta en unos días si funcionó.
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

  // Aprendizaje con sus 4 respuestas (también es el insight en la memoria) + momentum de reflexión.
  await saveLearning(supabase, user.id, {
    source: reference || r.title, kind: 'video', learned: r.reflection,
    ...(r.meaning ? { meaning: r.meaning } : {}), ...(r.action ? { action: r.action } : {}), ...(r.measure ? { measure: r.measure } : {}),
  }, todayISO(profile?.timezone ?? 'America/Mexico_City'), { origin: 'video', moment_id: data.id, video_id: r.videoId ?? null });
  return Response.json({ ok: true, id: data.id });
}
