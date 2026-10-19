'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { track } from '@/components/providers/analytics';
import { OUTCOMES, OUTCOME_LABEL, type Outcome } from '@/lib/learning';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const AFTER: Record<Outcome, string> = {
  funciono: 'Eso ya es evidencia. Quedó en tu historia.',
  a_medias: 'A medias también enseña. ¿Qué ajustarías? Cuéntaselo a SOI.',
  no_lo_hice: 'Pasa. Lo aprendido sigue ahí: elige un momento más fácil para probarlo.',
};

/** ¿Funcionó? Un toque (y, si quiere, lo que notó). */
export function LearningCheck({ id }: { id: string }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [picked, setPicked] = useState<Outcome | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!picked) return;
    setBusy(true);
    const res = await fetch(`/api/learnings/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome: picked, ...(note.trim() ? { note: note.trim() } : {}) }) }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { toast('No se pudo guardar. Intenta de nuevo.'); return; }
    track('learning_checked', { outcome: picked });
    toast(AFTER[picked]);
    start(() => router.refresh());
  }

  return (
    <div className="mt-3">
      <div role="radiogroup" aria-label="¿Funcionó?" className="grid grid-cols-3 gap-2">
        {OUTCOMES.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={picked === o} onClick={() => setPicked(o)}
            className={cn('press tap-target rounded-[12px] px-2 py-2.5 text-sm font-medium', picked === o ? 'bg-soi-ink text-white' : 'bg-white shadow-ring hover:bg-soi-tray')}>
            {OUTCOME_LABEL[o]}
          </button>
        ))}
      </div>
      {picked && (
        <div className="mt-3">
          <label htmlFor={`note-${id}`} className="text-sm font-medium">¿Qué notaste? <span className="font-normal text-soi-muted">(opcional)</span></label>
          <textarea id={`note-${id}`} value={note} onChange={(e) => setNote(e.target.value.slice(0, 400))} rows={2}
            className="mt-1.5 w-full resize-none rounded-[14px] bg-soi-canvas p-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
          <button type="button" onClick={save} disabled={busy} className={buttonClass('primary', 'sm', 'mt-2')}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      )}
    </div>
  );
}
