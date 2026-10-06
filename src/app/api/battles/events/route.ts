import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { ENEMY_IDS } from '@/config/enemies';
import { recordEnemy } from '@/lib/battles';

const Body = z.object({ enemy: z.enum(ENEMY_IDS), evidence: z.string().trim().max(300).optional() });

/** "Apareció hoy": la persona marca que un enemigo intentó ganar terreno. */
export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  return Response.json({ ok: await recordEnemy(user.id, parsed.data.enemy, { source: 'manual', evidence: parsed.data.evidence ?? null }) });
}
