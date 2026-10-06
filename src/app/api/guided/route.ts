import { blockAIForCreators } from '@/lib/creators/profile';
import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, getProfile } from '@/lib/billing/check-access';
import { detectCrisis } from '@/lib/ai/crisis';
import { generateGuided, personalContext, saveGuided } from '@/lib/ai/content-agents';
import { blockConfigFor } from '@/lib/guided';

export const maxDuration = 60;

const Body = z.object({
  kind: z.enum(['meditation', 'affirmations', 'manifestation']),
  intention: z.string().trim().min(2).max(300),
  minutes: z.number().int().min(1).max(30).optional(),
});

/**
 * Genera con su agente (Calma, Voz Interior, Asunción) una meditación, afirmaciones o una manifestación
 * personalizadas con lo que SOI sabe de la persona. Se guarda en su biblioteca y devuelve el bloque listo.
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const noAI = await blockAIForCreators(supabase, user.id);
  if (noAI) return noAI;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Cuéntale a SOI qué intención tienes.' }, { status: 400 });
  const { kind, intention, minutes } = parsed.data;
  if (detectCrisis(intention)) return Response.json({ ok: false, reason: 'crisis', message: 'Lo que escribiste importa. Hablemos en el chat: ahí tienes líneas de ayuda.' }, { status: 422 });
  if (!(await canAccess(user.id, 'routine_execution')).allowed) {
    return Response.json({ ok: false, message: 'Generar meditaciones, afirmaciones y manifestaciones es parte de SOI+.' }, { status: 402 });
  }
  try {
    const profile = await getProfile(user.id);
    const ctx = await personalContext(supabase, user.id, profile, intention);
    const g = await generateGuided(kind, ctx, intention, minutes ?? 5);
    const itemId = await saveGuided(supabase, user.id, g, intention, minutes);
    return Response.json({ ok: true, itemId, ...g, block: blockConfigFor(g, itemId) });
  } catch (error) {
    console.error('[guided]', error instanceof Error ? error.message : error);
    return Response.json({ ok: false, message: 'SOI no pudo escribirlo ahora. Intenta en un momento.' }, { status: 503 });
  }
}
