import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { getMoment, playableBlocks, resolveVideoBlocks, canRun } from '@/lib/moments/server';
import { MomentPlayer } from '@/components/moments/moment-player';

export const metadata: Metadata = { title: 'Moment en curso' };

export default async function PlayMomentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/login?next=/m/${id}/play`);
  const m = await getMoment(supabase, id);
  if (!m) notFound();

  const { access, profile } = await getAccessMap(user.id);
  const [blocks, allowed] = await Promise.all([playableBlocks(supabase, m), canRun(supabase, user.id, m, access.routine_execution)]);
  if (!blocks) redirect(`/m/${id}`); // premium sin comprar: el detalle ofrece obtenerlo
  const ready = await resolveVideoBlocks(supabase, user.id, blocks, access.youtube_embed);

  return (
    <MomentPlayer
      moment={{ id: m.id, title: m.title, objective: m.objective, source: m.source, author: m.author }}
      blocks={ready}
      locked={!allowed}
      ttsAllowed={access.tts && (profile?.tts_enabled ?? true)}
      voice={profile?.voice_preference}
    />
  );
}
