'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Download } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { DELETE_WORD, deleteConfirmed } from '@/lib/account/rules';

/** Ajustes → Tus datos: descargar todo lo tuyo o borrar tu cuenta para siempre. */
export function AccountData() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!deleteConfirmed(text) || busy) return;
    setBusy(true);
    const res = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: text }) });
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      try { localStorage.clear(); sessionStorage.clear(); } catch { /* sin almacenamiento */ }
      window.location.replace('/');
      return;
    }
    setBusy(false);
    toast(json.message ?? 'No pudimos borrar tu cuenta. Intenta de nuevo.');
  }

  return (
    <section className="rounded-[20px] bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold">Tus datos</h2>
      <p className="mt-1 text-sm text-soi-muted">Descarga todo lo que SOI guarda de ti: conversaciones, Moments, tu mapa, lo que escribiste y tus archivos.</p>
      <a href="/api/account/export" download className={buttonClass('outline', 'sm', 'mt-3')}>
        <Download className="h-4 w-4" aria-hidden="true" /> Descargar mis datos
      </a>

      <div className="mt-6 border-t border-black/5 pt-4">
        <h3 className="font-medium">Borrar mi cuenta</h3>
        <p className="mt-1 text-sm text-soi-muted">Se borran tu cuenta y todo lo tuyo, y se cancela tu suscripción. No se puede deshacer.</p>
        <Button size="sm" variant="ghost" className="mt-2 text-soi-danger" onClick={() => { setText(''); setOpen(true); }}>Borrar mi cuenta</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { if (!busy) setOpen(o); }} title="¿Borrar tu cuenta?" description="Se borran tus conversaciones, Moments, tu mapa, lo que escribiste y tus archivos. Si tienes SOI+, se cancela sin más cobros. No se puede deshacer.">
        <form onSubmit={(e) => { e.preventDefault(); void remove(); }} className="flex flex-col gap-3">
          <p className="text-sm text-soi-muted">Si quieres conservar algo, primero descarga tus datos.</p>
          <div>
            <Label htmlFor="delete-confirm">Escribe {DELETE_WORD} para confirmar</Label>
            <Input id="delete-confirm" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>Cancelar</Button>
            <Button type="submit" size="sm" variant="danger" disabled={!deleteConfirmed(text) || busy}>{busy ? 'Borrando…' : 'Borrar para siempre'}</Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
