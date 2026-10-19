import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { LearningInput } from '@/lib/learning';
import { saveLearning } from '@/lib/learning-server';
import { todayISO } from '@/lib/utils';

/** Guardar lo aprendido (las 4 preguntas). Si hay acción, SOI pregunta en unos días si funcionó. */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = LearningInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Cuéntame de dónde viene y qué aprendiste.' }, { status: 400 });
  const profile = await getProfile(user.id);
  const id = await saveLearning(supabase, user.id, parsed.data, todayISO(profile?.timezone ?? 'America/Mexico_City'), { origin: 'aprender' });
  return id ? Response.json({ ok: true, id }) : Response.json({ ok: false, message: 'No se pudo guardar.' }, { status: 500 });
}
