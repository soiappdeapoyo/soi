import { createAdminClient } from '@/lib/supabase/server';

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
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
