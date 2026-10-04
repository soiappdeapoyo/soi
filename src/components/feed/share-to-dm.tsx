'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Dialog } from '@/components/ui/dialog';
import type { DmThreadView } from '@/lib/social/dm';
import { Avatar } from './avatar';

/** Enviar una publicación o un Moment por mensaje directo a una conversación existente. */
export function ShareToDm({ open, onOpenChange, postId, moment }: { open: boolean; onOpenChange: (o: boolean) => void; postId?: string; moment?: string }) {
  const [threads, setThreads] = useState<DmThreadView[] | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  useEffect(() => {
    if (!open || threads) return;
    fetch('/api/dm/threads').then((r) => r.json()).then((j) => setThreads(j.threads ?? [])).catch(() => setThreads([]));
  }, [open, threads]);

  async function send(t: DmThreadView) {
    setSending(t.id);
    const res = await fetch(`/api/dm/threads/${t.id}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, moment }),
    });
    const json = await res.json().catch(() => ({}));
    setSending(null);
    if (!res.ok) { toast(json.message ?? 'No se pudo enviar.'); return; }
    toast(`Enviado a ${t.other.display_name}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Enviar por mensaje">
      {!threads ? <div className="skeleton h-32 rounded-[14px]" /> : threads.length ? (
        <ul className="flex max-h-[50dvh] flex-col gap-1 overflow-y-auto">
          {threads.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => send(t)} disabled={Boolean(sending)}
                className="press flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-soi-sidebar disabled:opacity-60">
                <Avatar url={t.other.avatar_url} name={t.other.display_name} size={32} />
                <span className="flex-1 truncate text-sm">{t.other.display_name}</span>
                {sending === t.id && <span className="text-xs text-soi-muted">Enviando…</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-soi-muted">Aún no tienes conversaciones. Abre una desde el perfil de alguien que te sigue.</p>}
    </Dialog>
  );
}
