'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { unlockAudio } from '@/lib/voice/player';
import { toast } from 'sonner';
import { Play, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Preparar (o reutilizar) el Moment para combatir a un enemigo y empezarlo. */
export function PrepareCounter({ enemy, label, className }: { enemy: string; label: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const res = await fetch('/api/battles/moment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enemy }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudo preparar.'); return; }
    router.push(json.play ? `/m/${json.id}/play` : `/m/${json.id}`);
  }
  if (className) {
    return <button type="button" onClick={() => { unlockAudio(); void go(); }} disabled={busy} className={className}><Play className="h-4 w-4 fill-current" aria-hidden="true" /> {busy ? 'Preparando…' : label}</button>;
  }
  return <Button size="sm" onClick={go} disabled={busy}><Play className="h-4 w-4" aria-hidden="true" /> {busy ? 'Preparando…' : label}</Button>;
}

/** "Apareció hoy": marcar a mano que un enemigo intentó ganar terreno. */
export function MarkAppeared({ enemy, name }: { enemy: string; name: string }) {
  const router = useRouter();
  async function mark() {
    const res = await fetch('/api/battles/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enemy }) });
    toast(res.ok ? `Registrado: ${name} apareció hoy. Ahora sabes cómo enfrentarlo.` : 'No se pudo registrar.');
    router.refresh();
  }
  return <Button size="sm" variant="outline" onClick={mark}><Plus className="h-4 w-4" aria-hidden="true" /> Apareció hoy</Button>;
}

/** Borrar un registro que no reconoces. */
export function DeleteEvent({ id }: { id: string }) {
  const router = useRouter();
  async function del() {
    if (!window.confirm('¿Borrar este registro? Úsalo si SOI se equivocó.')) return;
    const res = await fetch(`/api/battles/events/${id}`, { method: 'DELETE' });
    if (res.ok) router.refresh(); else toast('No se pudo borrar.');
  }
  return (
    <button type="button" onClick={del} aria-label="Borrar este registro" className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-soi-subtle hover:bg-black/[0.04] hover:text-soi-ink">
      <Trash2 className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}
