import { createAdminClient } from '@/lib/supabase/server';
import { generateRitual, ritualContent } from '@/lib/ritual';
import { loadNorth } from '@/lib/north';
import { sendPush } from '@/lib/push/send';
import { todayISO } from '@/lib/utils';
import type { UserProfile } from '@/types/database';
import type { PushSubscription } from 'web-push';

export const maxDuration = 300;

/** Solo SOI+. Genera el ritual del día y envía push. */
export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('No autorizado', { status: 401 });
  }
  const db = createAdminClient();
  const { data: users } = await db.from('user_profiles').select('*').eq('plan', 'soi_plus').limit(500);

  let generated = 0;
  for (const p of (users ?? []) as (UserProfile & { push_subscription: PushSubscription | null })[]) {
    const date = todayISO(p.timezone ?? 'America/Mexico_City');
    const { data: exists } = await db.from('agent_knowledge').select('id')
      .eq('user_id', p.user_id).eq('category', 'ritual_diario').eq('metadata->>date', date).maybeSingle();
    if (exists) continue;
    try {
      const ritual = await generateRitual(p, date, await loadNorth(db, p.user_id, p).catch(() => null));
      await db.from('agent_knowledge').insert({
        user_id: p.user_id, category: 'ritual_diario', title: `Ritual ${date}`,
        content: ritualContent(ritual),
        metadata: ritual, tags: ['ritual', ritual.phase],
      });
      generated++;
      if (p.push_subscription) {
        await sendPush(p.push_subscription, { title: 'Tu ritual de hoy está listo ✨', body: ritual.intention || ritual.affirmation, url: '/ritual' });
      }
    } catch (e) {
      console.error('[daily-ritual]', p.user_id, e);
    }
  }
  return Response.json({ ok: true, generated });
}
