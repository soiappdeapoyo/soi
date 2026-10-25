import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/server';
import { getPersonsSession, loadPersona } from '@/lib/persons/server';
import { CreatePersona } from '@/components/persons/create-persona';

export const metadata: Metadata = { title: 'Ajustar personaje' };

export default async function AdjustPersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) notFound();
  const { count } = await createAdminClient().from('persona_messages').select('id', { count: 'exact', head: true }).eq('persona_id', persona.id);

  return (
    <main id="main" className="min-h-dvh bg-[#F0F2F5]">
      <header className="flex items-center gap-2 bg-[#008069] px-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Link href={`/persons/${persona.id}`} aria-label="Volver al chat" className="press flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></Link>
        <h1 className="text-lg font-semibold">Ajustar a {persona.name}</h1>
      </header>
      <div className="p-4">
        <CreatePersona adjust={{ personaId: persona.id, name: persona.name, hue: persona.hue, source: persona.spec.sourceDescription, messages: count ?? 0 }} />
      </div>
    </main>
  );
}
