import { z } from 'zod';
import { createAdminClient, getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { effectivePlan } from '@/lib/billing/access-rules';
import { detectCrisis } from '@/lib/ai/crisis';
import { getCrisisResources } from '@/config/crisis-resources';
import { normalizePath } from '@/lib/analytics/nav';
import { cleanText, deviceFrom } from '@/lib/feedback';

const Body = z.object({
  rating: z.number().int().min(1).max(4).nullable().optional(),
  liked: z.string().max(2000).nullable().optional(),
  disliked: z.string().max(2000).nullable().optional(),
  path: z.string().max(500).optional(),
  source: z.enum(['bubble', 'prompt']).optional(),
});

const DAILY_MAX = 5;

/** Guarda la opinión de la burbuja con su contexto. Con señales de crisis, devuelve las líneas de ayuda de su país. */
export async function POST(req: Request) {
  const { user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'No pudimos enviarlo. Intenta de nuevo.' }, { status: 400 });
  const b = parsed.data;
  const liked = cleanText(b.liked), disliked = cleanText(b.disliked), rating = b.rating ?? null;
  if (!rating && !liked && !disliked) return Response.json({ ok: false, message: 'Elige una carita o escribe algo.' }, { status: 400 });

  const db = createAdminClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [profile, { count }] = await Promise.all([
    getProfile(user.id),
    db.from('app_feedback').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since),
  ]);
  if ((count ?? 0) >= DAILY_MAX) return Response.json({ ok: false, message: 'Ya nos dejaste varias opiniones hoy. ¡Gracias! Vuelve mañana si quieres contarnos más.' }, { status: 429 });

  const crisis = detectCrisis(`${liked ?? ''}\n${disliked ?? ''}`);
  const created = profile?.created_at ? Date.parse(profile.created_at) : NaN;
  const [pathname, search = ''] = (b.path ?? '').split('?');
  const path = pathname ? normalizePath(pathname, search) : null;
  const { error } = await db.from('app_feedback').insert({
    user_id: user.id, rating, liked, disliked,
    path: path?.slice(0, 200) ?? null,
    device: deviceFrom(req.headers.get('user-agent')),
    plan: profile ? effectivePlan(profile) : null,
    account_days: Number.isFinite(created) ? Math.max(0, Math.floor((Date.now() - created) / 86_400_000)) : null,
    source: b.source ?? 'bubble',
    crisis,
  });
  if (error) {
    console.error('[feedback] no se pudo guardar', error.message);
    return Response.json({ ok: false, message: 'No pudimos enviarlo. Intenta de nuevo.' }, { status: 500 });
  }
  // Ya dio su opinión: la burbuja no se le abrirá sola después.
  await db.from('user_profiles').update({ feedback_prompted_at: new Date().toISOString() }).eq('user_id', user.id).is('feedback_prompted_at', null);
  return Response.json({ ok: true, crisis, resources: crisis ? getCrisisResources(profile?.country) : undefined });
}
