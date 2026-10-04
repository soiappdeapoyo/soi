import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { SUPPORTED_COUNTRIES } from '@/config/crisis-resources';
import { ROUTINE_IDS } from '@/config/routines';

const Patch = z.object({
  display_name: z.string().min(1).max(60).optional(),
  goals: z.array(z.string().max(120)).max(10).optional(),
  blockers: z.array(z.string().max(120)).max(10).optional(),
  preferred_routine: z.enum(ROUTINE_IDS).optional(),
  morning_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  evening_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  timezone: z.string().max(60).optional(),
  country: z.enum(SUPPORTED_COUNTRIES as [string, ...string[]]).optional(),
  tts_enabled: z.boolean().optional(),
  voice_preference: z.string().max(60).optional(),
});

export async function PATCH(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Patch.safeParse(await req.json());
  if (!parsed.success) return Response.json({ ok: false, errors: parsed.error.flatten() }, { status: 400 });
  // Campos de plan/cobro NUNCA se aceptan desde el cliente.
  const { error } = await supabase.from('user_profiles').update(parsed.data).eq('user_id', user.id);
  return Response.json({ ok: !error });
}
