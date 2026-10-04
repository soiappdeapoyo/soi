import { z } from 'zod';
import { recordMomentum } from '@/lib/momentum-server';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, getProfile } from '@/lib/billing/check-access';
import { registerRitualDay } from '@/lib/streak';
import { ROUTINE_IDS } from '@/config/routines';
import { todayISO } from '@/lib/utils';

const Body = z.object({
  routineId: z.enum(ROUTINE_IDS),
  duration: z.number().int().min(0).max(36_000),
  steps: z.array(z.string()).max(20),
  moodBefore: z.number().int().min(1).max(5).optional(),
  moodAfter: z.number().int().min(1).max(5).optional(),
});

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'routine_execution')).allowed) return new Response('SOI+ requerido', { status: 402 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const { routineId, duration, steps, moodBefore, moodAfter } = parsed.data;

  const profile = await getProfile(user.id);
  const today = todayISO(profile?.timezone ?? undefined);

  const { error } = await supabase.from('daily_routines').upsert({
    user_id: user.id, routine_type: routineId, routine_date: today,
    completed_at: new Date().toISOString(), total_duration_seconds: duration,
    steps_completed: steps, mood_before: moodBefore, mood_after: moodAfter,
  }, { onConflict: 'user_id,routine_date,routine_type' });
  if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });

  const streak = await registerRitualDay(supabase, user.id, today);
  await recordMomentum(supabase, user.id, 'routine_completed', { eslabon: 'accion', metadata: { routine_id: routineId } });
  return Response.json({ ok: true, streak });
}
