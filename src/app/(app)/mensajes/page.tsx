import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { loadInbox } from '@/lib/social/dm';
import { Avatar, shortTime } from '@/components/feed/avatar';
import { LockedFeature } from '@/components/paywall/locked-feature';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mensajes' };

/** Bandeja de mensajes directos. */
export default async function MensajesPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { access } = await getAccessMap(user.id);
  const threads = await loadInbox(supabase, user.id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5 md:py-8">
      <Link href="/impulso" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Impulso</Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Mensajes</h1>
      {!access.community && !threads.length ? (
        <div className="mt-4"><LockedFeature title="Mensajes directos" description="Conversa en privado con las personas que te siguen en Impulso." /></div>
      ) : threads.length ? (
        <ul className="mt-3 divide-y divide-black/[0.06]">
          {threads.map((t) => (
            <li key={t.id}>
              <Link href={`/mensajes/${t.id}`} className="press flex items-center gap-3 py-3">
                <Avatar url={t.other.avatar_url} name={t.other.display_name} size={44} />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate', t.unread ? 'font-semibold' : 'font-medium')}>{t.other.display_name}</span>
                  <span className={cn('block truncate text-sm', t.unread ? 'text-soi-ink' : 'text-soi-muted')}>{t.last_message_preview ?? 'Nueva conversación'}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <time className="text-xs text-soi-subtle" dateTime={t.last_message_at}>{shortTime(t.last_message_at)}</time>
                  {t.unread && <span className="h-2.5 w-2.5 rounded-full bg-soi-accent-fill" aria-label="Sin leer" />}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm text-soi-muted">Aún no tienes conversaciones. Escríbele a alguien que te sigue desde su perfil.</p>
      )}
    </div>
  );
}
