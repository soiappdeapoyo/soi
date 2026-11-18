import { createServerClient as createSSRClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { accessTokenFromCookies } from './session-cookie';

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function createServerClient() {
  const cookieStore = await cookies();
  return createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet: CookieToSet[]) => {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Component: no puede escribir cookies; la sesión la renueva el middleware (src/lib/supabase/middleware.ts).
          }
        },
      },
    },
  );
}

/** Service role — SOLO servidor (webhooks, cron). Nunca exponer al cliente. */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

/** Lo que la app usa de la persona con sesión (sale del token verificado). */
export type SessionUser = {
  id: string;
  email: string | undefined;
  user_metadata: Record<string, unknown>;
  app_metadata: Record<string, unknown>;
};

/**
 * Usuario autenticado o null. Cacheado por petición (React `cache`): el layout y la página comparten la misma
 * validación.
 *
 * `getClaims()` verifica la firma del token (ES256) con la llave pública del proyecto, que se descarga una vez y
 * queda en memoria: no hace un viaje a Supabase Auth en cada pantalla ni en cada llamada a la API, como
 * `getUser()`. Un token vencido se renueva igual que antes; uno inválido o con la firma mal → sin sesión.
 */
export const getSessionUser = cache(async () => {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const c = !error ? data?.claims : null;
  const user: SessionUser | null = c?.sub
    ? {
        id: c.sub,
        email: typeof c.email === 'string' && c.email ? c.email : undefined,
        user_metadata: (c.user_metadata as Record<string, unknown> | undefined) ?? {},
        app_metadata: (c.app_metadata as Record<string, unknown> | undefined) ?? {},
      }
    : null;
  return { supabase, user };
});

/**
 * Como `getSessionUser`, pero NUNCA renueva la sesión: solo verifica el token de acceso que trae la cookie (vencido →
 * sin sesión). Para peticiones que salen al dejar la app (sendBeacon, keepalive), cuya respuesta puede no llegar: ver
 * `session-cookie.ts`. El cliente que devuelve actúa como la persona (RLS) con ese token.
 */
export async function getSessionUserPassive(): Promise<{ supabase: Awaited<ReturnType<typeof createServerClient>> | null; user: SessionUser | null }> {
  const token = accessTokenFromCookies((await cookies()).getAll());
  if (!token || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { supabase: null, user: null };
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  const c = !error ? data?.claims : null;
  if (!c?.sub) return { supabase: null, user: null };
  return {
    supabase: supabase as unknown as Awaited<ReturnType<typeof createServerClient>>,
    user: {
      id: c.sub,
      email: typeof c.email === 'string' && c.email ? c.email : undefined,
      user_metadata: (c.user_metadata as Record<string, unknown> | undefined) ?? {},
      app_metadata: (c.app_metadata as Record<string, unknown> | undefined) ?? {},
    },
  };
}
