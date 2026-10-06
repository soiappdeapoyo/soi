import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { proposeIdentities } from '@/lib/identity/propose';
import { resolveRefs } from '@/lib/day-plan';

export const maxDuration = 30;

/** SOI propone identidades (la persona las confirma, edita o descarta en la interfaz). No guarda nada. */
export async function POST() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { data: runs } = await supabase.from('moment_runs').select('moment_id, moment_slug').eq('user_id', user.id)
    .not('completed_at', 'is', null).order('completed_at', { ascending: false }).limit(30);
  const refs = [...new Set((runs ?? []).map((r) => (r.moment_id ? `m:${r.moment_id}` : `s:${r.moment_slug}`)))].slice(0, 10);
  const titles = [...(await resolveRefs(supabase, refs)).values()].map((m) => m.title);
  const { data: existing } = await supabase.from('identities').select('name').eq('user_id', user.id).neq('status', 'archived');
  const have = new Set((existing ?? []).map((e) => (e.name as string).toLowerCase()));
  const proposals = (await proposeIdentities(supabase, user.id, await getProfile(user.id), titles)).filter((p) => !have.has(p.name.toLowerCase()));
  return Response.json({ proposals });
}
