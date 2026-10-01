import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { MirrorCards } from '@/components/onboarding/mirror-cards';

export const metadata: Metadata = { title: 'Bienvenida' };

export default async function OnboardingPage() {
  const { user } = await getSessionUser();
  if (!user) redirect('/login');
  const profile = await getProfile(user.id);
  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <MirrorCards name={profile?.display_name?.split(' ')[0] ?? 'alma'} />
    </div>
  );
}
