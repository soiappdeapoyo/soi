import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import Link from 'next/link';
import { getMoment, playableBlocks, resolveVideoBlocks, canRun, enroll, fullBlocks } from '@/lib/moments/server';
import { enrichGuidedBlocks } from '@/lib/moments/enrich';
import { resolveLibraryBlocks } from '@/lib/moments/library-blocks';
import { blocksForDay, challengeLength, challengeState } from '@/lib/moments/challenge';
import { buttonClass } from '@/components/ui/button';
import { todayISO } from '@/lib/utils';
import { MomentPlayer } from '@/components/moments/moment-player';
import { loadDayPlan, playQueue, refOf } from '@/lib/day-plan';
import { isCreatorAccount } from '@/lib/creators/profile';

export const metadata: Metadata = { title: 'Moment en curso' };

export default async function PlayMomentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lista?: string; auto?: string }> }) {
  const { id } = await params;
  const { lista, auto } = await searchParams;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/login?next=/m/${id}/play`);
  const m = await getMoment(supabase, id);
  if (!m) notFound();

  const [{ access, profile }, creatorAccount] = await Promise.all([getAccessMap(user.id), isCreatorAccount(supabase, user.id)]);
  // Moments propios sin contenido guiado ("medita" con solo tiempo): los agentes lo completan una vez y se guarda.
  // En una cuenta de creador no: su contenido es 100% suyo.
  if (!m.official && m.creator_id === user.id && access.routine_execution && !creatorAccount) {
    const raw = await fullBlocks(supabase, m);
    if (raw) {
      const { blocks: enriched, changed } = await enrichGuidedBlocks(supabase, user.id, profile, raw, `${m.title}. ${m.objective}`);
      if (changed) await supabase.from('soi_blueprints').update({ blocks: enriched, updated_at: new Date().toISOString() }).eq('id', m.id).eq('creator_id', user.id);
    }
  }
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
  // Lista de reproducción de Hoy (Mi día): qué número es y qué sigue.
  const queue = lista === 'hoy'
    ? playQueue((await loadDayPlan(supabase, user.id, profile?.timezone ?? 'America/Mexico_City')).items, refOf(m))
    : null;
  const ready = await resolveVideoBlocks(supabase, user.id, await resolveLibraryBlocks(toPlay, { youtube: access.youtube_embed }), access.youtube_embed);

  return (
    <MomentPlayer
      moment={{ id: m.id, title: m.title, objective: m.objective, source: m.source, author: m.author, cover: m.cover }}
      blocks={ready}
      locked={!allowed}
      challenge={challenge}
      playlist={queue}
      aiContent={!creatorAccount}
      autoStart={Boolean(queue) && auto === '1' && allowed}
      ttsAllowed={access.tts && (profile?.tts_enabled ?? true)}
      voice={profile?.voice_preference}
    />
  );
}
