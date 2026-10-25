import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Archive, Plus, UserRound } from 'lucide-react';
import { getPersonsSession, loadInbox } from '@/lib/persons/server';
import { createAdminClient } from '@/lib/supabase/server';
import { trialDaysLeft } from '@/lib/billing/access-rules';
import { ChatList } from '@/components/persons/chat-list';
import { CreatePersona } from '@/components/persons/create-persona';
import { PERSONA_PRESETS } from '@/config/persons-presets';
import { PERSONS_BRAND } from '@/config/persons';
import { loadReferrals } from '@/lib/persons/referrals';
import { REFERRAL_FIRST_DAYS, REFERRAL_NEXT_DAYS } from '@/lib/persons/entitlements';

export const dynamic = 'force-dynamic';

/** Chats: cada contacto es una persona sintética. Vacío: crear una o agregar un arquetipo listo. */
export default async function PersonsHome() {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const [{ chats, coach }, { count: archived }] = await Promise.all([
    loadInbox(s),
    createAdminClient().from('personas').select('id', { count: 'exact', head: true }).eq('user_id', s.userId).not('archived_at', 'is', null),
  ]);
  const days = trialDaysLeft(s.profile);
  const refs = await loadReferrals(s.userId);
  // Aviso de días ganados durante 2 días después de ganarlos.
  const reward = refs.lastReward && Date.now() - Date.parse(refs.lastReward.rewarded_at!) < 2 * 86_400_000 ? refs.lastReward : null;
  const firstReward = refs.list.some((r) => r.reward_days > 0) ? REFERRAL_NEXT_DAYS : REFERRAL_FIRST_DAYS;

  return (
    <main id="main" className="pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-1 bg-[#008069] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <h1 className="flex-1 text-xl font-semibold">{PERSONS_BRAND}</h1>
        <Link href="/persons/nueva" aria-label="Nueva persona" className="press flex h-11 w-11 items-center justify-center rounded-full"><Plus className="h-6 w-6" aria-hidden="true" /></Link>
        <Link href="/persons/cuenta" aria-label="Tu cuenta" className="press flex h-11 w-11 items-center justify-center rounded-full"><UserRound className="h-5 w-5" aria-hidden="true" /></Link>
      </header>

      {reward && (
        <Link href="/persons/invitar" className="block bg-[#D9FDD3] px-4 py-2 text-sm font-medium text-[#0B3B1E]">🎉 Ganaste {reward.reward_days} días más de prueba: {reward.name ?? 'alguien'} que invitaste empezó a practicar.</Link>
      )}
      {s.plan === 'trial' && (
        <Link href="/persons/invitar" className="flex items-center justify-between gap-3 bg-[#E7F3EF] px-4 py-2 text-sm text-[#005C4B]">
          <span>Prueba: todo desbloqueado · {days === 1 ? 'queda 1 día' : `quedan ${days} días`}</span>
          <span className="shrink-0 font-semibold">Invita y gana días</span>
        </Link>
      )}
      {s.plan === 'free' && (
        <div className="bg-[#E7F3EF] px-4 py-3 text-sm text-[#005C4B]">
          <p className="font-semibold">Tu prueba terminó.</p>
          <p className="mt-0.5">Invita a alguien a practicar y gana {firstReward} días más con todo desbloqueado, o pasa a Plus.</p>
          <div className="mt-2 flex gap-2">
            <Link href="/persons/invitar" className="rounded-full bg-[#008069] px-3.5 py-1.5 font-medium text-white">Invitar y ganar {firstReward} días</Link>
            <Link href="/persons/planes" className="rounded-full bg-white px-3.5 py-1.5 font-medium text-[#005C4B]">Ver Plus</Link>
          </div>
        </div>
      )}

      {(archived ?? 0) > 0 && (
        <Link href="/persons/archivados" className="flex items-center gap-4 px-5 py-3 text-[15px] font-medium text-[#111B21] active:bg-black/[0.04]">
          <Archive className="h-5 w-5 text-[#008069]" aria-hidden="true" />
          <span className="flex-1">Archivados</span>
          <span className="nums text-sm text-[#117A3E]">{archived}</span>
        </Link>
      )}

      {chats.length ? <ChatList initial={chats} coach={coach} /> : (
        <div className="px-4 py-6">
          <p className="text-center text-lg font-medium">Aún no tienes con quién practicar.</p>
          <p className="mt-1 text-center text-soi-muted">Crea a alguien desde una descripción o agrega a una de estas personas.</p>
          <div className="mt-6"><CreatePersona presets={PERSONA_PRESETS} /></div>
        </div>
      )}

      {chats.length > 0 && (
        <Link href="/persons/nueva" aria-label="Nueva persona" className="press fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-[max(1.25rem,calc((100vw-48rem)/2+1.25rem))] z-20 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#008069] text-white shadow-raised">
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Link>
      )}
    </main>
  );
}
