'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { buttonClass } from '@/components/ui/button';

/** La visión del mapa, editable en su lugar (sin rehacer el diagnóstico). */
export function VisionEditor({ vision }: { vision: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(vision ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch('/api/life-map', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ vision: text }) }).catch(() => null);
    setSaving(false);
    if (!res?.ok) { toast('No se pudo guardar. Intenta de nuevo.'); return; }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex items-start gap-2">
        <p className="flex-1 text-pretty text-[19px] font-medium leading-snug">{vision ?? 'Aún no escribes en quién te quieres convertir.'}</p>
        <button type="button" onClick={() => setEditing(true)} aria-label="Editar tu visión"
          className="press tap-target -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  }
  return (
    <div>
      <label htmlFor="vision" className="sr-only">En un año, quiero ser alguien que…</label>
      <textarea id="vision" value={text} onChange={(e) => setText(e.target.value.slice(0, 400))} rows={3} maxLength={400} autoFocus
        placeholder="Quiero ser alguien que…"
        className="w-full resize-none rounded-[14px] bg-white p-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={save} disabled={saving} className={buttonClass('primary', 'sm')}>{saving ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" onClick={() => { setText(vision ?? ''); setEditing(false); }} className={buttonClass('ghost', 'sm')}>Cancelar</button>
      </div>
    </div>
  );
}
