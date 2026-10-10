import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { SettingsForm } from '@/components/settings/settings-form';
import { TimezoneField } from '@/components/settings/timezone-field';
import { ReturnSetup } from '@/components/pwa/return-setup';

export const metadata: Metadata = { title: 'Ajustes' };

export default async function AjustesPage() {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  const { profile, plan, access } = await getAccessMap(user.id);

  return (
    <div className="mx-auto max-w-xl px-5 py-8">
      <h1 className="text-3xl font-semibold">Ajustes</h1>
      <p className="mb-6 text-soi-muted">Plan actual: <strong>{plan === 'soi_plus' ? 'SOI+' : plan === 'trial' ? 'Prueba gratis' : 'Free'}</strong> · {user.email}</p>
      <section className="mb-6 rounded-[20px] bg-white p-5 shadow-soft">
        <h2 className="mb-3 text-lg font-semibold">Hora local</h2>
        <TimezoneField country={profile?.country ?? null} timezone={profile?.timezone ?? null} auto={profile?.timezone_auto ?? true} />
      </section>
      <section className="mb-6 rounded-[20px] bg-white p-5 shadow-soft">
        <ReturnSetup variant="settings" pushOn={Boolean(profile?.push_subscription) && (profile?.reminders_enabled ?? true)} reminderTime={profile?.reminder_time ?? null} where="ajustes" />
      </section>
      <SettingsForm
        ttsEnabled={profile?.tts_enabled ?? true}
        voice={profile?.voice_preference ?? null}
        ttsAllowed={access.tts}
        hasSubscription={Boolean(profile?.stripe_customer_id)}
      />
    </div>
  );
}
