'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { track } from '@/components/providers/analytics';

/** «SOI me escribe»: un mensaje al día como de un amigo, a veces con nota de voz. */
export function CoachMessagesToggle({ enabled: initial }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function change(next: boolean) {
    setBusy(true);
    setEnabled(next);
    const res = await fetch('/api/coach/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { setEnabled(!next); toast('No se pudo guardar. Intenta de nuevo.'); return; }
    track('coach_messages_toggled', { enabled: next });
    toast(next ? 'SOI te escribirá cada día' : 'SOI ya no te escribirá primero');
  }

  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-lg font-semibold">SOI me escribe</span>
        <span className="mt-0.5 block text-[15px] text-soi-muted">Un mensaje al día, como de un amigo, con lo que SOI sabe de ti. A veces, una nota de voz.</span>
      </span>
      <input type="checkbox" role="switch" checked={enabled} disabled={busy} onChange={(e) => void change(e.target.checked)}
        className="mt-1.5 h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-soi-tray shadow-ring transition-colors duration-(--dur-base) before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-white before:shadow-soft before:transition-transform before:duration-(--dur-base) before:content-[''] checked:bg-soi-ink checked:before:translate-x-[22px] disabled:opacity-60" />
    </label>
  );
}
