import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { remember } from '@/lib/ai/rag';
import { recordMomentum } from '@/lib/momentum-server';
import { EVIDENCE_MILESTONES } from '@/config/navigation';

const Body = z.object({
  title: z.string().min(3).max(120),
  content: z.string().min(3).max(2000),
  eslabon: z.enum(['pensamiento', 'emocion', 'accion', 'resultado']).default('resultado'),
  tags: z.array(z.string().max(30)).max(5).default([]),
  shareToCommunity: z.boolean().default(false),
});

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'evidence_save')).allowed) return new Response('SOI+ requerido', { status: 402 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const { title, content, eslabon, tags } = parsed.data;

  const id = await remember(supabase, {
    user_id: user.id, category: 'evidencia', title, content, tags,
    metadata: { eslabon_soi: eslabon, source: 'manual' }, status: 'completado',
  });
  if (id) await recordMomentum(supabase, user.id, 'evidence_saved', { eslabon });

  const { count } = await supabase.from('agent_knowledge')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('category', 'evidencia');
  const milestone = EVIDENCE_MILESTONES.find((m) => m === count) ?? null;

  return Response.json({ ok: Boolean(id), id, total: count ?? 0, milestone });
}
