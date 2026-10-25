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

  return (
    <main id="main" className="pb-24">
      <header className="sticky top-0 z-20 flex items-center gap-1 bg-[#008069] px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <h1 className="flex-1 text-xl font-semibold">{PERSONS_BRAND}</h1>
        <Link href="/persons/nueva" aria-label="Nueva persona" className="press flex h-11 w-11 items-center justify-center rounded-full"><Plus className="h-6 w-6" aria-hidden="true" /></Link>
        <Link href="/persons/cuenta" aria-label="Tu cuenta" className="press flex h-11 w-11 items-center justify-center rounded-full"><UserRound className="h-5 w-5" aria-hidden="true" /></Link>
      </header>

      {s.plan === 'trial' && (
        <p className="bg-[#E7F3EF] px-4 py-2 text-sm text-[#005C4B]">Prueba: todo desbloqueado · {days === 1 ? 'queda 1 día' : `quedan ${days} días`}</p>
      )}
      {s.plan === 'free' && (
        <Link href="/persons/planes" className="block bg-[#E7F3EF] px-4 py-2 text-sm text-[#005C4B]">Plan Free: 2 personas · Pasa a Plus para tener más, notas de voz y modo ciego</Link>
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
