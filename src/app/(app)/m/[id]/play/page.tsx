import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import Link from 'next/link';
import { getMoment, playableBlocks, resolveVideoBlocks, canRun, enroll } from '@/lib/moments/server';
import { resolveLibraryBlocks } from '@/lib/moments/library-blocks';
import { blocksForDay, challengeLength, challengeState } from '@/lib/moments/challenge';
import { buttonClass } from '@/components/ui/button';
import { todayISO } from '@/lib/utils';
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
  // Retos: se juega solo el día que toca (un día por día de calendario). Entrar al reproductor inscribe.
  let challenge: { day: number; total: number } | null = null;
  let toPlay = blocks;
  if (m.kind === 'challenge' && allowed) {
    const e = await enroll(supabase, user.id, m);
    const total = challengeLength(blocks, m.duration_days);
    const st = challengeState(e?.completed ?? {}, total, todayISO(profile?.timezone ?? undefined));
    if (!st.availableToday) {
      return (
        <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
          <p className="nums text-sm text-soi-muted">{m.title} · {st.completedCount} de {total} días</p>
          <h1 className="text-2xl font-semibold">{st.finished ? 'Completaste el reto' : `Hoy ya está. Mañana sigue el día ${st.currentDay}.`}</h1>
          <p className="text-soi-muted">{st.finished ? 'Cada día fue una evidencia de tu nueva identidad.' : 'Un día a la vez. Vuelve mañana.'}</p>
          <Link href={`/m/${m.id}`} className={buttonClass('outline', 'md', 'mt-2')}>Ver el reto</Link>
        </div>
      );
    }
    challenge = { day: st.currentDay!, total };
    toPlay = blocksForDay(blocks, st.currentDay!);
  }
  const ready = await resolveVideoBlocks(supabase, user.id, await resolveLibraryBlocks(toPlay, { youtube: access.youtube_embed }), access.youtube_embed);

  return (
    <MomentPlayer
      moment={{ id: m.id, title: m.title, objective: m.objective, source: m.source, author: m.author }}
      blocks={ready}
      locked={!allowed}
      challenge={challenge}
      ttsAllowed={access.tts && (profile?.tts_enabled ?? true)}
      voice={profile?.voice_preference}
    />
  );
}
