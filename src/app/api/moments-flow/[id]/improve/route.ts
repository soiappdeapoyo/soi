import { blockAIForCreators } from '@/lib/creators/profile';
import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { getMoment, fullBlocks } from '@/lib/moments/server';
import { proposeImprovement } from '@/lib/moments/improve';

const Body = z.object({ runId: z.string().uuid() });

/** Propuesta de "mejor versión" a partir de una ejecución. No guarda nada: la persona decide. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const noAI = await blockAIForCreators(supabase, user.id);
  if (noAI) return noAI;
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });

  const [m, { data: run }, profile] = await Promise.all([
    getMoment(supabase, id),
    supabase.from('moment_runs').select('outputs, mood_before, mood_after, helped, learning').eq('id', parsed.data.runId).eq('user_id', user.id).maybeSingle(),
    getProfile(user.id),
  ]);
  if (!m || !run) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  const blocks = await fullBlocks(supabase, m);
  if (!blocks) return Response.json({ ok: false, message: 'No tienes acceso a este Moment.' }, { status: 402 });

  const outputs = (run.outputs ?? {}) as Record<string, { skipped?: boolean } | undefined>;
  const proposal = await proposeImprovement(m, blocks, {
    skipped: Object.entries(outputs).filter(([, o]) => o?.skipped).map(([k]) => k),
    moodBefore: run.mood_before as number | null, moodAfter: run.mood_after as number | null,
    helped: run.helped as boolean | null, learning: run.learning as string | null,
    availableMinutes: profile?.available_minutes ?? null,
  }, outputs);
  return Response.json({ ok: true, current: blocks, ...proposal });
}
