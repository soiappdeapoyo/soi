import { createAdminClient, getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { promptEligible } from '@/lib/feedback';

/**
 * ¿Se abre sola la burbuja ahora? Una vez en la vida de la cuenta: si toca, se anota en el mismo paso (aunque la
 * cierre sin responder, no vuelve a abrirse sola).
 */
export async function POST() {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const profile = await getProfile(user.id);
  if (!profile || profile.feedback_prompted_at || !profile.tour_seen_at || profile.app_role === 'persons') return Response.json({ open: false });

  const db = createAdminClient();
  const [{ count: sent }, { count: done }] = await Promise.all([
    db.from('app_feedback').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    db.from('moment_runs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).not('completed_at', 'is', null),
  ]);
  const created = profile.created_at ? Date.parse(profile.created_at) : Date.now();
  const open = promptEligible({
    promptedAt: null, tourSeen: true, sentBefore: (sent ?? 0) > 0, completedMoments: done ?? 0,
    accountDays: Math.floor((Date.now() - created) / 86_400_000),
  });
  if (!open) return Response.json({ open: false });
  const { data } = await db.from('user_profiles').update({ feedback_prompted_at: new Date().toISOString() })
    .eq('user_id', user.id).is('feedback_prompted_at', null).select('user_id');
  return Response.json({ open: Boolean(data?.length) });
}
