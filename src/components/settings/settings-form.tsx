'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label, Select } from '@/components/ui/input';
import { VOICES } from '@/lib/voice/tts';

type Props = { ttsEnabled: boolean; voice: string | null; ttsAllowed: boolean; hasSubscription: boolean; pushEnabled: boolean };

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function SettingsForm({ ttsEnabled, voice, ttsAllowed, hasSubscription, pushEnabled }: Props) {
  const [tts, setTts] = useState(ttsEnabled);
  const [v, setV] = useState(voice ?? 'es-MX-DaliaNeural');
  const [push, setPush] = useState(pushEnabled);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tts_enabled: tts, voice_preference: v }) });
    setMsg(res.ok ? 'Ajustes guardados ✓' : 'No se pudieron guardar.');
  }

  async function test() {
    const { speak } = await import('@/lib/voice/tts');
    await speak('Hoy va a ser el mejor día de todos.', { voice: v });
  }

  async function togglePush() {
    if (push) {
      await fetch('/api/push/subscribe', { method: 'DELETE' });
      setPush(false);
      return;
    }
    const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!key || !('serviceWorker' in navigator) || !('PushManager' in window)) { setMsg('Tu navegador no soporta notificaciones.'); return; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { setMsg('Permiso de notificaciones denegado.'); return; }
    const reg = await navigator.serviceWorker.register('/sw.js');
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
    const res = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) });
    setPush(res.ok);
  }

  async function portal() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    if (res.ok) window.location.href = ((await res.json()) as { url: string }).url;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-3xl border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Voz</h2>
        {!ttsAllowed && <p className="mt-1 text-sm text-black/60">La guía por voz es parte de SOI+.</p>}
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={tts} onChange={(e) => setTts(e.target.checked)} disabled={!ttsAllowed} className="h-4 w-4 accent-soi-gold" />
          Leer en voz alta respuestas y rutinas
        </label>
        <div className="mt-3">
          <Label htmlFor="st-voice">Voz</Label>
          <Select id="st-voice" value={v} onChange={(e) => setV(e.target.value)} disabled={!ttsAllowed}>
            {VOICES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
          </Select>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={save} size="sm">Guardar</Button>
          <Button onClick={test} size="sm" variant="outline" disabled={!ttsAllowed}>Probar voz</Button>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Notificaciones</h2>
        <p className="mt-1 text-sm text-black/60">Recibe tu ritual diario cada mañana (SOI+).</p>
        <Button onClick={togglePush} size="sm" variant="outline" className="mt-3">{push ? 'Desactivar notificaciones' : 'Activar notificaciones'}</Button>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white p-5">
        <h2 className="text-lg font-semibold">Suscripción</h2>
        {hasSubscription
          ? <Button onClick={portal} size="sm" variant="outline" className="mt-3">Administrar suscripción</Button>
          : <a href="/planes" className="mt-3 inline-block underline">Ver planes SOI+</a>}
      </section>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost">Cerrar sesión</Button>
      </form>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </div>
  );
}
