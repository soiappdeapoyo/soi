import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ROUTINES, isRoutineId } from '@/config/routines';
import { RitualTimer } from '@/components/rituals/ritual-timer';
import { PageHeader } from '@/components/layout/page-header';
import { PrincipioNav } from '@/components/principio/principio-nav';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: isRoutineId(id) ? ROUTINES[id].label : 'Rutina' };
}

export default async function RutinaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isRoutineId(id)) notFound();
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  const { profile, access } = await getAccessMap(user.id);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-3 sm:px-6">
      <PageHeader title="Principio SOI" />
      <PrincipioNav initial={ROUTINES[id].eslabon} />
      <RitualTimer
        routineId={id}
        locked={!access.routine_execution}
        ttsAllowed={access.tts && (profile?.tts_enabled ?? true)}
        voice={profile?.voice_preference}
      />
    </div>
  );
}
