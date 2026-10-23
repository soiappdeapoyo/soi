import { getSessionUser } from '@/lib/supabase/server';
import { exportUserData } from '@/lib/account/server';
import { exportFileName } from '@/lib/account/rules';

export const maxDuration = 60;

/** La persona descarga todos sus datos en un JSON. */
export async function GET() {
  const { user } = await getSessionUser();
  if (!user) return new Response('Inicia sesión.', { status: 401 });
  const data = await exportUserData(user.id);
  if (!data) return new Response('Cuenta no encontrada.', { status: 404 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${exportFileName()}"`,
      'Cache-Control': 'no-store',
    },
  });
}
