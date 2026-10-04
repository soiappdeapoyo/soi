'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mail } from 'lucide-react';

/** "Mensaje" en el perfil: abre (o recupera) la conversación si hay consentimiento. */
export function MessageButton({ userId, enabled }: { userId: string; enabled: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function open() {
    setBusy(true);
    const res = await fetch('/api/dm/threads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudo abrir la conversación.'); return; }
    router.push(`/mensajes/${json.id}`);
  }
  return (
    <button type="button" onClick={open} disabled={busy || !enabled} title={enabled ? undefined : 'Podrás escribirle cuando te siga'}
      className="press inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm shadow-ring disabled:opacity-40">
      <Mail className="h-4 w-4" aria-hidden="true" /> Mensaje
    </button>
  );
}
