import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { moderateFields } from '@/lib/social/guard';

const Patch = z.object({
  visibility: z.enum(['private', 'community']).optional(),
  userReflection: z.string().trim().max(2000).optional(),
  evidence: z.object({
    completed_actions: z.number().int().min(0).max(10_000).optional(),
    created_habits: z.number().int().min(0).max(1000).optional(),
    achieved_results: z.array(z.string().trim().max(200)).max(10).optional(),
  }).optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });

  const { data: m } = await supabase.from('soi_moments').select('title, insight, user_reflection, actions')
    .eq('id', id).eq('creator_id', user.id).maybeSingle();
  if (!m) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });

  if (parsed.data.visibility === 'community') {
    if (!(await canAccess(user.id, 'community')).allowed) return Response.json({ ok: false, message: 'Compartir en la comunidad es parte de SOI+.' }, { status: 402 });
    const actions = (m.actions as { title: string; detail?: string }[]) ?? [];
    const blocked = await moderateFields([m.title, m.insight, parsed.data.userReflection ?? m.user_reflection, ...actions.map((a) => `${a.title} ${a.detail ?? ''}`)]);
    if (blocked) return blocked;
  }

  const { error } = await supabase.from('soi_moments').update({
    ...(parsed.data.visibility ? { visibility: parsed.data.visibility } : {}),
    ...(parsed.data.userReflection !== undefined ? { user_reflection: parsed.data.userReflection } : {}),
    ...(parsed.data.evidence ? { evidence: parsed.data.evidence } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', id).eq('creator_id', user.id);
  return Response.json({ ok: !error });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { error } = await supabase.from('soi_moments').delete().eq('id', id).eq('creator_id', user.id);
  return Response.json({ ok: !error });
}
