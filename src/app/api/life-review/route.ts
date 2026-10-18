import { getSessionUser } from '@/lib/supabase/server';
import { remember } from '@/lib/ai/rag';
import { lifeArea } from '@/config/life-areas';
import { ReviewBody } from '@/lib/life-plan';

/**
 * La revisión de la semana: lo que funcionó, lo que aprendió, cómo están sus áreas de enfoque (una medición
 * semanal) y el foco de la semana que empieza (lo ven Hoy y todos los agentes: `currentWeek`).
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = ReviewBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Escribe tu foco para la semana.' }, { status: 400 });
  const r = parsed.data;

  const { error } = await supabase.from('life_reviews').upsert({
    user_id: user.id, week_start: r.weekStart, wins: r.wins || null, lesson: r.lesson || null, next_area: r.area, one_thing: r.oneThing,
  }, { onConflict: 'user_id,week_start' });
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar tu revisión.' }, { status: 500 });

  if (Object.keys(r.scores).length) await supabase.from('life_assessments').insert({ user_id: user.id, kind: 'semanal', scores: r.scores });

  // Lo que escribió llega a la memoria (SOI lo retoma en la conversación), sin bloquear la respuesta.
  const content = [r.wins && `Funcionó: ${r.wins}`, r.lesson && `Aprendí: ${r.lesson}`, `Foco de la semana (${lifeArea(r.area)?.label ?? r.area}): ${r.oneThing}`].filter(Boolean).join('\n');
  await remember(supabase, { user_id: user.id, category: 'pensamiento', tags: ['revision_semanal'], title: `Revisión de la semana del ${r.weekStart}`, content, metadata: { week_start: r.weekStart }, withEmbedding: false }).catch(() => null);
  return Response.json({ ok: true });
}
