import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { moderateFields } from '@/lib/social/guard';
import { HighlightsSchema } from '@/lib/creators/profile';

const Body = z.object({ highlights: HighlightsSchema });

/** Guarda los destacados del creador: solo con sus propios Moments publicados. */
export async function PUT(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Revisa los destacados: un título corto y al menos un Moment cada uno.' }, { status: 400 });
  const { highlights } = parsed.data;

  const ids = [...new Set(highlights.flatMap((h) => h.moment_ids))];
  if (ids.length) {
    const { data } = await supabase.from('soi_blueprints').select('id').eq('creator_id', user.id).eq('status', 'published').in('id', ids);
    if ((data ?? []).length !== ids.length) return Response.json({ ok: false, message: 'Solo puedes destacar tus Moments publicados.' }, { status: 400 });
  }
  const blocked = await moderateFields(highlights.map((h) => h.title), 'creator');
  if (blocked) return blocked;

  const { error, count } = await supabase.from('creator_profiles').update({ highlights, updated_at: new Date().toISOString() }, { count: 'exact' }).eq('user_id', user.id);
  if (error || !count) return Response.json({ ok: false, message: 'Activa tu cuenta de creador primero.' }, { status: error ? 500 : 403 });
  return Response.json({ ok: true });
}
