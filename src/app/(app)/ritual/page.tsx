import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { getOrCreateRitual } from '@/lib/ritual';
import { DailyRitualView } from '@/components/ritual/daily-ritual-view';
import { LockedFeature } from '@/components/paywall/locked-feature';
import { todayISO } from '@/lib/utils';

export const metadata: Metadata = { title: 'Ritual diario' };

export default async function RitualPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { profile, access } = await getAccessMap(user.id);

  if (!access.daily_ritual || !profile) {
    return (
      <div className="mx-auto max-w-xl px-5 py-8">
        <LockedFeature title="Ritual diario personalizado" description="Cada mañana SOI crea un ritual de 4 partes para ti: afirmación, visualización, acción y señal a notar." />
      </div>
    );
  }

  const today = todayISO(profile.timezone ?? undefined);
  const [{ ritual }, { data: log }] = await Promise.all([
    getOrCreateRitual(supabase, profile, today),
    supabase.from('ritual_logs').select('id').eq('user_id', user.id).eq('ritual_date', today).maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <DailyRitualView ritual={ritual} alreadyDone={Boolean(log)} ttsAllowed={access.tts} />
    </div>
  );
}
