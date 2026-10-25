import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { activeCount, getPersonsSession } from '@/lib/persons/server';
import { canCreatePersona, GATE_COPY } from '@/lib/persons/entitlements';
import { CreatePersona } from '@/components/persons/create-persona';
import { PERSONA_PRESETS } from '@/config/persons-presets';
import { buttonClass } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Nueva persona' };

export default async function NewPersonaPage() {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const allowed = canCreatePersona(s.limits, await activeCount(s.userId)).ok;

  return (
    <main id="main" className="min-h-dvh bg-[#F0F2F5] md:min-h-[calc(100dvh-2rem)]">
      <header className="flex items-center gap-2 bg-[#008069] px-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Link href="/persons" aria-label="Volver a los chats" className="press flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></Link>
        <h1 className="text-lg font-semibold">Crear personaje</h1>
      </header>
      <div className="p-4">
        {allowed ? <CreatePersona presets={PERSONA_PRESETS} /> : (
          <div className="rounded-2xl bg-white p-5 text-center shadow-soft">
            <p>{GATE_COPY.person_limit}</p>
            <Link href="/persons/planes" className={buttonClass('primary', 'md', 'mt-4 bg-[#008069] hover:bg-[#006E5A]')}>Ver Plus</Link>
          </div>
        )}
      </div>
    </main>
  );
}
