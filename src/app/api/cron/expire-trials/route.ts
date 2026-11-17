import { createAdminClient } from '@/lib/supabase/server';
import { archiveStaleMoments } from '@/lib/moments/stale';

export async function GET(req: Request) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('No autorizado', { status: 401 });
  }
  const admin = createAdminClient();
  const { error } = await admin.rpc('expire_trials');
  // Retención de crisis_log (dato sensible): 90 días.
  const { error: purgeError } = await admin.rpc('purge_crisis_logs');
  if (purgeError) console.error('[cron] purge_crisis_logs', purgeError.message);
  // Navegación de /panel/analytics: se conserva 180 días.
  const { error: navError } = await admin.rpc('purge_nav_events');
  if (navError) console.error('[cron] purge_nav_events', navError.message);
  // Embudo de la landing: se conserva 365 días.
  const { error: funnelError } = await admin.rpc('purge_funnel_events');
  if (funnelError) console.error('[cron] purge_funnel_events', funnelError.message);
  // Moments diseñados en el chat de la landing: 14 días sin reclamar, 30 tras guardarse.
  const { error: draftsError } = await admin.rpc('purge_moment_drafts');
  if (draftsError) console.error('[cron] purge_moment_drafts', draftsError.message);
  // Que no se sature de Moments: lo propuesto y no vivido en 7 días se archiva (no se borra; se recupera).
  const archived = await archiveStaleMoments(admin).catch((e: unknown) => { console.error('[cron] archivar Moments', e instanceof Error ? e.message : e); return 0; });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true, archived });
}
