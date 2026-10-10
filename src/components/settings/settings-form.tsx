'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label, Select } from '@/components/ui/input';
import { GUIDE_VOICES, guideVoice } from '@/config/voices';
import { unlockAudio } from '@/lib/voice/player';

type Props = { ttsEnabled: boolean; voice: string | null; ttsAllowed: boolean; hasSubscription: boolean };

export function SettingsForm({ ttsEnabled, voice, ttsAllowed, hasSubscription }: Props) {
  const [tts, setTts] = useState(ttsEnabled);
  const [v, setV] = useState<string>(guideVoice(voice));
  // Toasts (Sonner): copy corto, sin signos de exclamación.
  const setMsg = (m: string) => toast(m);

  async function save() {
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tts_enabled: tts, voice_preference: v }) });
    setMsg(res.ok ? 'Ajustes guardados' : 'No se pudieron guardar los ajustes');
  }

  async function test() {
    unlockAudio();
    const { speak } = await import('@/lib/voice/tts');
    await speak('Hola. Soy tu guía en SOI. Respira conmigo: inhala… y exhala. Hoy va a ser un buen día.', { voice: v, style: 'guide' });
  }

  async function portal() {
    const res = await fetch('/api/stripe/portal', { method: 'POST' });
    if (res.ok) window.location.href = ((await res.json()) as { url: string }).url;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-[20px] bg-white shadow-soft p-5">
        <h2 className="text-lg font-semibold">Voz</h2>
        {!ttsAllowed && <p className="mt-1 text-sm text-soi-muted">La guía por voz es parte de SOI+.</p>}
        <label className="mt-3 flex items-center gap-2">
          <input type="checkbox" checked={tts} onChange={(e) => setTts(e.target.checked)} disabled={!ttsAllowed} className="h-4 w-4 accent-soi-accent" />
          Voz guía en los Moments y en el chat
        </label>
        <div className="mt-3">
          <Label htmlFor="st-voice">Voz</Label>
          <Select id="st-voice" value={v} onChange={(e) => setV(e.target.value)} disabled={!ttsAllowed}>
            {GUIDE_VOICES.map((x) => <option key={x.id} value={x.id}>{x.label} · {x.detail}</option>)}
          </Select>
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={save} size="sm">Guardar</Button>
          <Button onClick={test} size="sm" variant="outline" disabled={!ttsAllowed}>Probar voz</Button>
        </div>
      </section>

      <section className="rounded-[20px] bg-white shadow-soft p-5">
        <h2 className="text-lg font-semibold">Suscripción</h2>
        {hasSubscription
          ? <Button onClick={portal} size="sm" variant="outline" className="mt-3">Administrar suscripción</Button>
          : <a href="/planes" className="mt-3 inline-block underline">Ver planes SOI+</a>}
      </section>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost">Cerrar sesión</Button>
      </form>
    </div>
  );
}
