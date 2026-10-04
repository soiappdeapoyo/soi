import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, getProfile } from '@/lib/billing/check-access';
import { ActionCardsSchema, EslabonSchema } from '@/lib/action-card';
import { recordMomentum } from '@/lib/momentum-server';
import { moderateFields } from '@/lib/social/guard';
import { remember } from '@/lib/ai/rag';

const Body = z.object({
  title: z.string().trim().min(3).max(120),
  category: EslabonSchema.default('accion'),
  triggerState: z.array(z.enum(['motivation', 'confusion', 'anxiety', 'discipline', 'finance', 'health', 'career', 'relationships'])).max(4).default([]),
  sourceType: z.enum(['video', 'book', 'podcast', 'personal_experience', 'ai_generated']).default('personal_experience'),
  sourceReference: z.string().trim().max(200).optional(),
  insight: z.string().trim().min(3).max(1000),
  reflectionQuestion: z.string().trim().max(300).optional(),
  userReflection: z.string().trim().max(2000).optional(),
  actions: ActionCardsSchema.default([]),
  visibility: z.enum(['private', 'community']).default('private'),
});

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: 'Revisa los campos del momento.' }, { status: 400 });
  const m = parsed.data;

  if (m.visibility === 'community') {
    if (!(await canAccess(user.id, 'community')).allowed) return Response.json({ ok: false, message: 'Compartir en la comunidad es parte de SOI+.' }, { status: 402 });
    const blocked = await moderateFields([m.title, m.insight, m.userReflection, m.sourceReference, ...m.actions.map((a) => `${a.title} ${a.detail ?? ''}`)]);
    if (blocked) return blocked;
  }

  const profile = await getProfile(user.id);
  const { data, error } = await supabase.from('soi_moments').insert({
    creator_id: user.id, author_name: profile?.display_name ?? null, title: m.title, category: m.category,
    trigger_state: m.triggerState, source_type: m.sourceType, source_reference: m.sourceReference ?? null,
    insight: m.insight, reflection_question: m.reflectionQuestion ?? null, user_reflection: m.userReflection ?? null,
    actions: m.actions, visibility: m.visibility,
  }).select('id').single();
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar el momento.' }, { status: 500 });

  await remember(supabase, {
    user_id: user.id, category: 'pensamiento', title: m.title, content: m.insight,
    tags: ['insight', 'moment'], metadata: { eslabon_soi: m.category, moment_id: data.id },
  });
  await recordMomentum(supabase, user.id, 'reflection', { eslabon: m.category, metadata: { moment_id: data.id } });
  return Response.json({ ok: true, id: data.id });
}
