import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { remember } from '@/lib/ai/rag';
import { ChapterBody } from '@/lib/chapters';
import { buildSnapshot, loadChapterDue } from '@/lib/chapters-server';
import { loadPlan } from '@/lib/life-plan-server';
import { todayISO } from '@/lib/utils';

/**
 * Cerrar un capítulo (90 días o el año): medición completa, la foto del capítulo, lo que escribió, su foco
 * siguiente (y en el anual, su visión nueva y la carta a su yo de dentro de un año). El plan de 90 días termina
 * hoy: el siguiente plan empieza con fechas nuevas.
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = ChapterBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }, { status: 400 });
  const b = parsed.data;
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? 'America/Mexico_City';

  // Solo el capítulo que toca (las fechas las decide el servidor, no el cliente).
  const { due } = await loadChapterDue(supabase, user.id, tz);
  if (!due || due.period_end !== b.period_end || due.kind !== b.kind) return Response.json({ ok: false, message: 'Este capítulo ya no está abierto.' }, { status: 409 });

  const { error: aErr } = await supabase.from('life_assessments').insert({ user_id: user.id, kind: b.kind, scores: b.scores });
  if (aErr) return Response.json({ ok: false, message: 'No se pudo guardar tu medición.' }, { status: 500 });

  const snapshot = await buildSnapshot(supabase, user.id, due, b.scores, tz);
  const { error } = await supabase.from('life_chapters').insert({
    user_id: user.id, kind: b.kind, period_start: due.period_start, period_end: due.period_end,
    proud: b.proud || null, lesson: b.lesson || null, letting_go: b.letting_go || null,
    next_vision: b.next_vision || null, letter: b.letter || null, snapshot,
  });
  if (error) return Response.json({ ok: false, message: 'No se pudo cerrar tu capítulo.' }, { status: 500 });

  const plan = await loadPlan(supabase, user.id);
  await supabase.from('life_maps').update({
    focus_areas: b.focus, updated_at: new Date().toISOString(),
    ...(b.next_vision ? { vision: b.next_vision } : {}),
    ...(plan ? { plan: { ...plan, ends_on: todayISO(tz) } } : {}),
  }).eq('user_id', user.id);

  const content = [b.proud && `Orgullo: ${b.proud}`, b.lesson && `Aprendí de mí: ${b.lesson}`, b.letting_go && `Suelto: ${b.letting_go}`, b.next_vision && `Visión nueva: ${b.next_vision}`]
    .filter(Boolean).join('\n');
  if (content) {
    await remember(supabase, {
      user_id: user.id, category: 'resultado', title: b.kind === 'anual' ? 'Cierre de mi año' : 'Cierre de mi capítulo de 90 días',
      content, tags: ['capitulo', b.kind], metadata: { eslabon_soi: 'resultado', period_end: due.period_end },
    });
  }
  return Response.json({ ok: true });
}
