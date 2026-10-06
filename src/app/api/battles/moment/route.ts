import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { ENEMY_IDS, enemyById } from '@/config/enemies';
import { parseBlocks } from '@/config/actions';

const Body = z.object({ enemy: z.enum(ENEMY_IDS) });

/** Prepara (o reutiliza) el Moment para combatir a un enemigo: contenido real con su fuente. */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const enemy = enemyById(parsed.data.enemy)!;
  const title = `Contra ${enemy.name}: ${enemy.counter.title}`.slice(0, 120);
  const { data: existing } = await supabase.from('soi_blueprints').select('id').eq('creator_id', user.id).eq('title', title).neq('status', 'archived').limit(1).maybeSingle();
  if (existing) return Response.json({ ok: true, id: existing.id, play: (await canAccess(user.id, 'routine_execution')).allowed });
  const { blocks } = parseBlocks(enemy.counter.blocks.map((b, i) => ({ ...b, id: `e${i + 1}` })));
  const { data, error } = await supabase.from('soi_blueprints').insert({
    creator_id: user.id, title, objective: `Vencer a ${enemy.name} con ${enemy.allies.join(', ')}.`,
    kind: enemy.counter.kind, source: enemy.counter.source.slice(0, 200), blocks, steps: [], status: 'private',
  }).select('id').single();
  if (error) return Response.json({ ok: false, message: 'No se pudo preparar.' }, { status: 500 });
  return Response.json({ ok: true, id: data.id, play: (await canAccess(user.id, 'routine_execution')).allowed });
}
