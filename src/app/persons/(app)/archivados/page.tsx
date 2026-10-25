import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getPersonsSession, loadChatList } from '@/lib/persons/server';
import { ChatList } from '@/components/persons/chat-list';

export const metadata: Metadata = { title: 'Archivados' };

/** Conversaciones archivadas: se leen completas, nunca se borran. */
export default async function ArchivedPage() {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const chats = await loadChatList(s.userId, { archived: true });
  return (
    <main id="main">
      <header className="flex items-center gap-2 bg-[#008069] px-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Link href="/persons" aria-label="Volver a los chats" className="press flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></Link>
        <h1 className="text-lg font-semibold">Archivados</h1>
      </header>
      {chats.length ? <ChatList initial={chats} archived /> : <p className="p-6 text-center text-soi-muted">No tienes chats archivados.</p>}
    </main>
  );
}
