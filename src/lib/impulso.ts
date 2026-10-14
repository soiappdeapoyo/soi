import { redirect } from 'next/navigation';
import { IMPULSO_ENABLED } from '@/config/features';
import { isAdminEmail } from '@/lib/admin/auth';
import { getSessionUser } from '@/lib/supabase/server';

/** Impulso oculto en el MVP (`IMPULSO_ENABLED`): solo administradores entran por la URL; el resto va a Hoy. */
export async function requireImpulso() {
  if (IMPULSO_ENABLED) return;
  const { user } = await getSessionUser();
  if (!isAdminEmail(user?.email)) redirect('/hoy');
}
