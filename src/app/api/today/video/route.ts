import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { recommendVideo } from '@/lib/social/recommend-video';
import type { MomentumState } from '@/lib/momentum';

const STATES = ['high_energy', 'low_energy', 'anxiety', 'confusion'] as const;

/** Video recomendado para el estado actual. Bloqueado en Free, igual que la herramienta de YouTube del chat. */
export async function GET(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'youtube_embed')).allowed) return Response.json({ locked: true, video: null });
  const s = new URL(req.url).searchParams.get('state');
  const state: MomentumState = (STATES as readonly string[]).includes(s ?? '') ? (s as MomentumState) : 'low_energy';
  const video = await recommendVideo(supabase, user.id, state);
  return Response.json({ locked: false, video });
}
