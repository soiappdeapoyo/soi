import { getSessionUser } from '@/lib/supabase/server';
import { ForgetBody } from '@/lib/self-knowledge';
import { removeHabit } from '@/lib/ai/habit-memory';

/** Las memorias que la persona puede borrar desde "Lo que SOI sabe de ti" (no evidencias ni historial). */
const FORGETTABLE = ['perfil_usuario', 'pensamiento'];

/** "Esto no es así": SOI olvida ese dato. Solo lo propio (RLS) y solo lo que se muestra en el mapa. */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = ForgetBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false }, { status: 400 });
  const f = parsed.data;

  if (f.kind === 'memory') {
    const { error } = await supabase.from('agent_knowledge').delete().eq('id', f.id).eq('user_id', user.id).in('category', FORGETTABLE);
    return Response.json({ ok: !error });
  }
  if (f.kind === 'habit') return Response.json({ ok: await removeHabit(supabase, user.id, f.name) });

  const { data: p } = await supabase.from('user_profiles').select('goals, blockers').eq('user_id', user.id).maybeSingle();
  const patch = f.kind === 'goal' ? { goals: ((p?.goals as string[] | null) ?? []).filter((g) => g !== f.value) }
    : f.kind === 'blocker' ? { blockers: ((p?.blockers as string[] | null) ?? []).filter((b) => b !== f.value) }
    : { dominant_emotion: null };
  const { error } = await supabase.from('user_profiles').update(patch).eq('user_id', user.id);
  return Response.json({ ok: !error });
}
