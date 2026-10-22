'use client';

import { splitForSpeech } from './tts';

/**
 * Saludo hablado de un recordatorio, en lugar de una alarma: la voz neuronal de SOI (estilo `wake`, /api/tts)
 * que empieza casi inaudible y sube de menos a más. Con Web Audio (GainNode) porque iOS no deja cambiar el
 * volumen de un <audio>. Sin voz neuronal (Free, tope diario, sin conexión): la voz del navegador, cada frase
 * un poco más fuerte.
 *
 * Los navegadores solo dejan sonar audio después de un toque: primeWakeAudio() se llama en el primer toque de la
 * sesión. Si aún no hubo ninguno, playWake() devuelve 'blocked' y la app ofrece un botón "Escuchar a SOI".
 */

let ctx: AudioContext | null = null;
let current: { stop: () => void } | null = null;

/** Volumen: casi en silencio → medio en 1.5 s → completo en 4.5 s. */
const RAMP = [[0, 0.05], [1.5, 0.45], [4.5, 1]] as const;
/** Voz del navegador: cada frase un poco más fuerte. */
const BROWSER_VOLUMES = [0.25, 0.5, 0.75, 1];

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (ctx) return ctx;
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  ctx = Ctx ? new Ctx() : null;
  return ctx;
}

/** Desbloquea el audio en un toque (síncrono dentro del gesto: requisito de iOS). */
export function primeWakeAudio() {
  const c = context();
  if (c && c.state === 'suspended') void c.resume().catch(() => {});
}

async function ready(c: AudioContext): Promise<boolean> {
  if (c.state === 'running') return true;
  // Sin un toque previo, resume() puede quedarse esperando: no más de 400 ms.
  await Promise.race([c.resume().catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
  return (c.state as AudioContextState) === 'running';
}

export function stopWake() {
  current?.stop();
  current = null;
}

async function neural(c: AudioContext, text: string): Promise<'played' | 'unavailable'> {
  try {
    const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, style: 'wake' }) });
    if (res.status !== 200) return 'unavailable';
    const buffer = await c.decodeAudioData(await res.arrayBuffer());
    const source = c.createBufferSource();
    const gain = c.createGain();
    const t = c.currentTime + 0.05;
    gain.gain.setValueAtTime(RAMP[0][1], t);
    for (const [at, v] of RAMP.slice(1)) gain.gain.linearRampToValueAtTime(v, t + at);
    source.buffer = buffer;
    source.connect(gain).connect(c.destination);
    return await new Promise((resolve) => {
      current = { stop: () => { try { source.stop(); } catch { /* ya terminó */ } resolve('played'); } };
      source.onended = () => resolve('played');
      source.start(t);
    });
  } catch {
    return 'unavailable';
  }
}

function browser(text: string): Promise<'played' | 'failed'> {
  if (!('speechSynthesis' in window)) return Promise.resolve('failed');
  const synth = window.speechSynthesis;
  synth.cancel();
  const parts = splitForSpeech(text, 160);
  const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('es'));
  return new Promise((resolve) => {
    let left = parts.length;
    if (!left) return resolve('failed');
    current = { stop: () => { synth.cancel(); resolve('played'); } };
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.lang = voice?.lang ?? 'es-MX';
      if (voice) u.voice = voice;
      u.rate = 0.9;
      u.volume = BROWSER_VOLUMES[Math.min(i, BROWSER_VOLUMES.length - 1)]!;
      u.onend = u.onerror = () => { if (--left === 0) resolve('played'); };
      synth.speak(u);
    });
  });
}

/** Dice el saludo. 'blocked' = el navegador aún no deja sonar audio (falta un toque). */
export async function playWake(text: string): Promise<'played' | 'blocked' | 'failed'> {
  const c = context();
  if (!c || !text.trim()) return 'failed';
  if (!(await ready(c))) return 'blocked';
  stopWake();
  const r = await neural(c, text);
  return r === 'played' ? 'played' : browser(text);
}
