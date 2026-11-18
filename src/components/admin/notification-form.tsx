'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';

/** Escribir (o pegar) un aviso y mandarlo a la campanita de todas las cuentas de SOI o de una. */
export function NotificationForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [to, setTo] = useState<'all' | 'user'>('all');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !title.trim() || !body.trim()) return;
    if (to === 'all' && !confirm('¿Enviar este aviso a todas las cuentas de SOI?')) return;
    setBusy(true);
    const res = await fetch('/api/panel/notifications', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, url, email: to === 'user' ? email : '' }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) { toast(json?.message ?? 'No se pudo enviar.'); return; }
    toast(`Enviado a ${json.sent} ${json.sent === 1 ? 'persona' : 'personas'}.`);
    setTitle(''); setBody(''); setUrl('');
    router.refresh();
  }

  return (
    <form onSubmit={send} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="n-title">Título</Label>
        <Input id="n-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required className="mt-1" placeholder="Algo nuevo en SOI" />
      </div>
      <div>
        <Label htmlFor="n-body">Texto</Label>
        <Textarea id="n-body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={5} required className="mt-1" placeholder="Pega aquí el texto del aviso" />
        <p className="mt-1 text-right text-xs text-soi-subtle nums">{body.length}/2000</p>
      </div>
      <div>
        <Label htmlFor="n-url">Botón a una pantalla de la app (opcional)</Label>
        <Input id="n-url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={300} className="mt-1" placeholder="/hoy, /chat?nueva=1, /mi-vida?tab=mapa…" />
      </div>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">Para</legend>
        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={to === 'all'} onChange={() => setTo('all')} /> Todas las cuentas de SOI (sin Háblame ni demo)</label>
        <label className="flex items-center gap-2 text-sm"><input type="radio" checked={to === 'user'} onChange={() => setTo('user')} /> Una persona (por correo)</label>
        {to === 'user' && <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="correo@ejemplo.com" aria-label="Correo de la cuenta" />}
      </fieldset>
      <Button type="submit" disabled={busy || !title.trim() || !body.trim()}>{busy ? 'Enviando…' : 'Enviar aviso'}</Button>
    </form>
  );
}
