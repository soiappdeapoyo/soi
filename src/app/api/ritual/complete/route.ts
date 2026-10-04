import { z } from 'zod';
import { recordMomentum } from '@/lib/momentum-server';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, getProfile } from '@/lib/billing/check-access';
import { registerRitualDay } from '@/lib/streak';
import { todayISO } from '@/lib/utils';

const Body = z.object({
  completedSteps: z.array(z.enum(['affirmation', 'visualization', 'action', 'signal'])),
  moodBefore: z.number().int().min(1).max(5).optional(),
  moodAfter: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'daily_ritual')).allowed) return new Response('SOI+ requerido', { status: 402 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });

  const profile = await getProfile(user.id);
  const today = todayISO(profile?.timezone ?? undefined);
  await supabase.from('ritual_logs').upsert({
    user_id: user.id, ritual_date: today, phase: profile?.ritual_phase ?? 'chispa',
    completed_steps: parsed.data.completedSteps, mood_before: parsed.data.moodBefore,
    mood_after: parsed.data.moodAfter, notes: parsed.data.notes,
  }, { onConflict: 'user_id,ritual_date' });

  const streak = await registerRitualDay(supabase, user.id, today);
  await recordMomentum(supabase, user.id, 'ritual_completed', { eslabon: 'accion' });
  return Response.json({ ok: true, streak });
}
