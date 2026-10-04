import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { recordMomentum } from '@/lib/momentum-server';

const Body = z.object({ videoId: z.string().min(3).max(32), title: z.string().max(200).optional(), channel: z.string().max(120).optional() });

/** El video terminó dentro de SOI: señal de inspiración. Una vez por video y por día. */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });

  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase.from('momentum_events').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('kind', 'video_watched').eq('metadata->>video_id', parsed.data.videoId).gte('created_at', start.toISOString());
  if (!count) {
    await recordMomentum(supabase, user.id, 'video_watched', {
      eslabon: 'emocion', metadata: { video_id: parsed.data.videoId, title: parsed.data.title ?? null, channel: parsed.data.channel ?? null },
    });
  }
  return Response.json({ ok: true });
}
