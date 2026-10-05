'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/input';
import { GUIDED_LABEL, type GuidedKind } from '@/lib/guided';
import { cn } from '@/lib/utils';

const PLACEHOLDER: Record<GuidedKind, string> = {
  meditation: 'Soltar la ansiedad antes de mi entrevista de mañana',
  affirmations: 'Confiar en mi talento para cobrar lo que vale mi trabajo',
  manifestation: 'Vivir en un departamento con luz y plantas',
};

/** Pedirle a un agente una meditación, afirmaciones o una manifestación escritas para ti. */
export function GuidedCreate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<GuidedKind>('meditation');
  const [intention, setIntention] = useState('');
  const [minutes, setMinutes] = useState(5);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    setBusy(true); setMsg(null);
    const res = await fetch('/api/guided', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, intention, minutes }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) { setMsg(json.message ?? 'No se pudo crear.'); return; }
    setOpen(false);
    router.push(`/mi-vida/recursos/${json.itemId}`);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Sparkles className="h-4 w-4" aria-hidden="true" /> Crear</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Escrito para ti" description="SOI lo crea con lo que sabe de tus metas, deseos y emociones.">
        <div role="radiogroup" aria-label="Qué crear" className="grid grid-cols-3 gap-1 rounded-[14px] bg-soi-sidebar p-1">
          {(Object.keys(GUIDED_LABEL) as GuidedKind[]).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
              className={cn('press h-9 rounded-lg text-sm', kind === k ? 'bg-white font-medium shadow-ring' : 'text-soi-muted')}>{GUIDED_LABEL[k]}</button>
          ))}
        </div>
        <Label htmlFor="g-int" className="mt-3">¿Para qué la quieres?</Label>
        <Textarea id="g-int" rows={2} maxLength={300} value={intention} onChange={(e) => setIntention(e.target.value)} placeholder={PLACEHOLDER[kind]} />
        {kind === 'meditation' && (
          <div role="radiogroup" aria-label="Duración" className="mt-3 flex gap-1.5">
            {[3, 5, 10, 15].map((m) => (
              <button key={m} type="button" role="radio" aria-checked={minutes === m} onClick={() => setMinutes(m)}
                className={cn('press nums h-8 rounded-full px-3 text-sm', minutes === m ? 'bg-soi-ink text-white' : 'bg-soi-sidebar shadow-ring')}>{m} min</button>
            ))}
          </div>
        )}
        {msg && <p role="alert" className="mt-2 text-sm text-soi-danger">{msg}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button size="sm" onClick={create} disabled={busy || intention.trim().length < 2}>{busy ? 'SOI está escribiendo…' : 'Crear'}</Button>
        </div>
      </Dialog>
    </>
  );
}
