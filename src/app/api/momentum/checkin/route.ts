import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { recordMomentum } from '@/lib/momentum-server';

const Body = z.object({ state: z.enum(['high_energy', 'low_energy', 'anxiety', 'confusion']) });

/** Check-in de un toque en Hoy: cómo llega la persona. El Director lo usa para decidir la intervención. */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  await recordMomentum(supabase, user.id, 'checkin', {
    eslabon: parsed.data.state === 'anxiety' ? 'emocion' : null, metadata: { state: parsed.data.state },
  });
  return Response.json({ ok: true });
}
