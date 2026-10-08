import { z } from 'zod';
import { createAdminClient, getSessionUser } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin/auth';
import { normalizePath } from '@/lib/analytics/nav';

const Body = z.object({
  events: z.array(z.object({
    kind: z.enum(['view', 'leave']),
    path: z.string().min(1).max(300),
    at: z.string().datetime(),
    sid: z.string().min(8).max(64),
  })).min(1).max(50),
});

/** Guarda la navegación (pantallas en orden) para /panel/analytics. Sin cuentas demo ni administradores. */
export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response(null, { status: 204 });
  if (isAdminEmail(user.email) || /\.demo@soi\.app$/i.test(user.email ?? '')) return new Response(null, { status: 204 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });

  const now = Date.now();
  const rows = parsed.data.events.map((e) => {
    const [p, q] = e.path.split('?');
    // El reloj del dispositivo puede estar mal: fuera de ±1 día se usa la hora del servidor.
    const t = Date.parse(e.at);
    return {
      user_id: user.id, session_id: e.sid, kind: e.kind,
      path: normalizePath(p ?? '/', q ?? ''),
      at: Math.abs(t - now) < 86_400_000 ? new Date(t).toISOString() : new Date(now).toISOString(),
    };
  });
  const { error } = await createAdminClient().from('nav_events').insert(rows);
  if (error) console.error('[nav] no se pudo guardar', error.message);
  return new Response(null, { status: 204 });
}
