import { getSessionUser } from '@/lib/supabase/server';
import { BlueprintInput, textOf, toRow } from '@/lib/social/blueprint-input';
import { moderateFields } from '@/lib/social/guard';

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const { data: creator } = await supabase.from('creator_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
  if (!creator) return Response.json({ ok: false, message: 'Primero crea tu perfil de creador.' }, { status: 403 });

  const parsed = BlueprintInput.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, message: parsed.error.issues[0]?.message ?? 'Revisa los campos.' }, { status: 400 });

  if (parsed.data.status === 'published') {
    const blocked = await moderateFields(textOf(parsed.data));
    if (blocked) return blocked;
  }

  const { data, error } = await supabase.from('soi_blueprints').insert({ creator_id: user.id, ...toRow(parsed.data) }).select('id').single();
  if (error) return Response.json({ ok: false, message: 'No se pudo guardar el Blueprint.' }, { status: 500 });
  if (parsed.data.momentId) {
    await supabase.from('soi_moments').update({ blueprint_id: data.id }).eq('id', parsed.data.momentId).eq('creator_id', user.id);
  }
  return Response.json({ ok: true, id: data.id });
}
