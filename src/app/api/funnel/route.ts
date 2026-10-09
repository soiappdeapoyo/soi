import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { FUNNEL_EVENTS, geoFromHeaders, referrerHost, visitorFrom } from '@/lib/analytics/funnel';

// Lo que se puede registrar desde el navegador (registro e inicio de sesión los anota /auth/callback).
const CLIENT_EVENTS = FUNNEL_EVENTS.filter((e) => e !== 'signup' && e !== 'login') as [string, ...string[]];

const Body = z.object({
  event: z.enum(CLIENT_EVENTS),
  detail: z.string().max(60).nullish(),
  vid: z.string().max(64).nullish(),
  ref: z.string().max(500).nullish(),
});

/** Embudo de la landing: un paso por llamada, con país y ciudad de Vercel (sin IP). Solo desde nuestro sitio. */
export async function POST(req: Request) {
  const host = new URL(req.url).host;
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== host) return new Response(null, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });

  const { event, detail, vid, ref } = parsed.data;
  const { error } = await createAdminClient().from('funnel_events').insert({
    visitor_id: visitorFrom(vid), event, detail: detail?.trim() || null,
    ...geoFromHeaders(req.headers),
    referrer: event === 'landing_view' ? referrerHost(ref, host) : null,
  });
  if (error) console.error('[funnel] no se pudo guardar', error.message);
  return new Response(null, { status: 204 });
}
