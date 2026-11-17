'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Archivados: los Moments que SOI propuso y no se vivieron en 7 días (o que la persona archivó). Nunca se borran:
 * «Recuperar» los regresa a Mis Moments con todo lo que tenían.
 */
export function ArchivedMoments({ items }: { items: { id: string; title: string; minutes: number }[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  if (!items.length) return null;

  async function restore(id: string) {
    setBusy(id);
    const res = await fetch(`/api/moments-flow/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'private' }) }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setBusy(null);
    if (!res?.ok || !json.ok) { toast('No se pudo recuperar. Intenta de nuevo.'); return; }
    toast('Volvió a Mis Moments');
    router.refresh();
  }

  return (
    <details className="group rounded-[20px] bg-soi-sidebar shadow-ring">
      <summary className="press flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-soi-muted [&::-webkit-details-marker]:hidden">
        <span>Archivados · <span className="nums">{items.length}</span></span>
        <span className="text-xs font-normal">Lo que no viviste en 7 días se guarda aquí</span>
      </summary>
      <ul className="flex flex-col px-4 pb-3">
        {items.map((m) => (
          <li key={m.id} className="flex items-center gap-3 border-t border-black/5 py-2.5">
            <span className="min-w-0 flex-1 truncate text-[15px]">{m.title}</span>
            <span className="nums shrink-0 text-xs text-soi-muted">{m.minutes} min</span>
            <button type="button" disabled={busy === m.id} onClick={() => void restore(m.id)}
              className="press shrink-0 rounded-full px-3 py-1.5 text-sm text-soi-ink shadow-ring disabled:opacity-50">Recuperar</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
