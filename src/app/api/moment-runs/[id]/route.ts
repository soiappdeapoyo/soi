import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';

const Body = z.object({
  outputs: z.record(z.unknown()).optional(),
  /** Dónde va la persona: si algo la interrumpe, retoma desde aquí. */
  progress: z.object({
    index: z.number().int().min(0).max(200),
    blockId: z.string().max(64),
    remaining: z.number().int().min(0).max(36000),
    pct: z.number().int().min(0).max(99),
  }).optional(),
});

/** Guarda lo que la persona escribe o marca en cada bloque y su avance (se puede retomar si cierra la app). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success || JSON.stringify(parsed.data.outputs ?? {}).length > 20_000) return new Response('Datos inválidos', { status: 400 });
  const { outputs, progress } = parsed.data;
  if (!outputs && !progress) return new Response('Datos inválidos', { status: 400 });
  const { error } = await supabase.from('moment_runs').update({
    ...(outputs ? { outputs } : {}),
    ...(progress ? { step_index: progress.index, step_block_id: progress.blockId, step_remaining: progress.remaining, progress: progress.pct, last_active_at: new Date().toISOString() } : {}),
  }).eq('id', id).eq('user_id', user.id).is('completed_at', null);
  return Response.json({ ok: !error });
}
