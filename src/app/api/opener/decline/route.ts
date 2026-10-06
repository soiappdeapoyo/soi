import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { getMoment } from '@/lib/moments/server';
import { remember } from '@/lib/ai/rag';
import { partOfDay, PART_LABEL } from '@/lib/day-plan';
import { hourInTz } from '@/lib/utils';

const Body = z.object({ id: z.string().min(2).max(60) });

/**
 * "Ahora no" a la propuesta del saludo: se guarda como conocimiento (qué, de qué tipo y a qué hora) para que el
 * próximo saludo proponga otra cosa y la IA del chat lo tenga presente. No consume consultas.
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const [m, profile] = await Promise.all([getMoment(supabase, parsed.data.id), getProfile(user.id)]);
  if (!m) return Response.json({ ok: false }, { status: 404 });
  const part = partOfDay(hourInTz(profile?.timezone ?? 'America/Mexico_City'));
  const ref = m.official ? `s:${m.slug}` : `m:${m.id}`;
  await remember(supabase, {
    user_id: user.id, category: 'perfil_usuario', tags: ['ahora_no'],
    title: `Ahora no: «${m.title}»`,
    content: `Por la ${PART_LABEL[part]} prefirió no hacer «${m.title}» (${m.kind}, ${m.required_minutes} min). Proponer algo distinto la próxima vez.`,
    metadata: { ref, title: m.title, kind: m.kind, part, minutes: m.required_minutes },
  });
  return Response.json({ ok: true });
}
