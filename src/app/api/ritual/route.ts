import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, getProfile } from '@/lib/billing/check-access';
import { getOrCreateRitual } from '@/lib/ritual';
import { todayISO } from '@/lib/utils';

export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'daily_ritual')).allowed) return new Response('SOI+ requerido', { status: 402 });
  const profile = await getProfile(user.id);
  if (!profile) return new Response('Perfil no encontrado', { status: 404 });
  const { ritual } = await getOrCreateRitual(supabase, profile, todayISO(profile.timezone ?? undefined));
  return Response.json(ritual);
}
