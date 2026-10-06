import { scheduleAutoCover } from '@/lib/moments/auto-cover';
import { getSessionUser } from '@/lib/supabase/server';
import { MomentInput, validBlocks, textOfBlocks, dbError } from '@/lib/moments/input';
import { ownsDocuments, publishDocuments } from '@/lib/moments/library-blocks';
import { moderateFields } from '@/lib/social/guard';
import { OFFICIAL_MOMENTS } from '@/config/official-moments';

/** Crear un Moment (constructor). Privado por defecto; publicar exige perfil de creador (RLS). */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = MomentInput.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Revisa los campos.' }, { status: 400 });
  const m = parsed.data;
  const v = validBlocks(m.blocks);
  if (!v.blocks) return Response.json({ ok: false, message: v.message }, { status: 400 });
  if (!(await ownsDocuments(user.id, v.blocks))) return Response.json({ ok: false, message: 'Solo puedes usar documentos de tu biblioteca.' }, { status: 403 });
  let blocks = v.blocks;
  if (m.status === 'published') {
    const pub = await publishDocuments(user.id, blocks);
    if (pub.error) return Response.json({ ok: false, message: pub.error }, { status: 400 });
    blocks = pub.blocks;
  }

  if (m.status === 'published') {
    const blocked = await moderateFields([m.title, m.objective, m.source, ...textOfBlocks(blocks)]);
    if (blocked) return blocked;
  }
  const { data, error } = await supabase.from('soi_blueprints').insert({
    creator_id: user.id, title: m.title, objective: m.objective, kind: m.kind, eslabon: m.eslabon, source: m.source,
    blocks, steps: [], status: m.status, tier: m.tier, price_cents: m.tier === 'premium' ? m.priceCents : 0,
    duration_days: m.kind === 'challenge' ? m.durationDays : 1,
  }).select('id').single();
  if (error) return dbError(error.message);
  // Portada automática si la persona no sube una (nunca pisa la suya).
  scheduleAutoCover(data.id as string, { title: m.title, objective: m.objective, kind: m.kind, blocks });
  return Response.json({ ok: true, id: data.id });
}

/** Moments que se pueden adjuntar a una publicación: los tuyos, los oficiales y los publicados recientes. */
export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const [{ data: own }, { data: published }] = await Promise.all([
    supabase.from('soi_blueprints').select('id, title, kind, required_minutes, status').eq('creator_id', user.id).neq('status', 'archived').order('updated_at', { ascending: false }).limit(20),
    supabase.from('soi_blueprints').select('id, title, kind, required_minutes, status').eq('status', 'published').neq('creator_id', user.id).order('executions_count', { ascending: false }).limit(10),
  ]);
  const official = OFFICIAL_MOMENTS.map((m) => ({ id: m.slug, title: `${m.title} · ${m.author}`, kind: m.kind, required_minutes: m.required_minutes, status: 'published' }));
  return Response.json({ own: own ?? [], official, published: published ?? [] });
}
