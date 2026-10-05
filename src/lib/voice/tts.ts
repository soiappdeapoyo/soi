'use client';

import type { VoiceStyle } from '@/config/voices';
import { getPlayer, isUnlocked, unlockAudio } from './player';

export { unlockAudio };

/**
 * Voz guía de SOI.
 * - Principal: voz neuronal (Gemini TTS vía /api/tts, MP3 en caché): humana, con estilo de guía.
 * - Respaldo: Web Speech API del navegador (si no hay acceso, clave, conexión o se alcanzó el tope diario).
 * Un solo <audio> reutilizado: se "desbloquea" con el primer toque (requisito de iOS para reproducir sin gesto).
 */

type Opts = { style?: VoiceStyle; rate?: number; pauseMs?: number };

let generation = 0;
let speaking = false;
let neuralOff = false; // si el servidor dice que no hay voz neuronal, no insistimos en esta sesión
const audioCache = new Map<string, Promise<string | null>>();

function supported() {
  return typeof window !== 'undefined';
}

export function isSpeaking() {
  return speaking;
}

/** Frases agrupadas para la voz neuronal: la primera corta (empieza rápido), las demás de hasta ~600 caracteres. */
export function chunkForVoice(text: string, first = 220, rest = 600): string[] {
  const parts = splitForSpeech(text, rest);
  const out: string[] = [];
  let cur = '';
  for (const p of parts) {
    const limit = out.length === 0 ? first : rest;
    if (cur && (cur + ' ' + p).length > limit) { out.push(cur); cur = p; } else cur = cur ? `${cur} ${p}` : p;
  }
  if (cur) out.push(cur);
  return out;
}

/** Divide en frases de ≤ max caracteres (también lo usa el respaldo del navegador, que corta locuciones largas). */
export function splitForSpeech(text: string, max = 220): string[] {
  const clean = text.replace(/[*_#>`[\]()]/g, '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?…]+[.!?…]*["»”]?\s*/g) ?? [clean];
  const out: string[] = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentence.length <= max) { out.push(sentence); continue; }
    let rest = sentence;
    while (rest.length > max) {
      const cut = rest.lastIndexOf(',', max) > 40 ? rest.lastIndexOf(',', max) + 1 : rest.lastIndexOf(' ', max) > 40 ? rest.lastIndexOf(' ', max) : max;
      out.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) out.push(rest);
  }
  return out;
}

function fetchAudio(text: string, style: VoiceStyle, voice?: string): Promise<string | null> {
  const key = `${voice ?? ''}|${style}|${text}`;
  const cached = audioCache.get(key);
  if (cached) return cached;
  const p = (async () => {
    if (neuralOff) return null;
    try {
      const res = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, style, ...(voice ? { voice } : {}) }) });
      if (res.status === 204) {
        if (res.headers.get('x-soi-tts') !== 'error') neuralOff = true; // sin acceso, sin clave o tope diario
        return null;
      }
      if (!res.ok) return null;
      return URL.createObjectURL(await res.blob());
    } catch {
      return null;
    }
  })();
  audioCache.set(key, p);
  void p.then((u) => { if (!u) audioCache.delete(key); });
  return p;
}

/** Prepara el audio de un texto (p. ej. el siguiente paso del Moment) para que empiece sin espera. */
export function prefetchSpeech(text: string, style: VoiceStyle = 'guide') {
  if (!supported() || neuralOff) return;
  const chunks = chunkForVoice(text.slice(0, 6000));
  if (chunks[0]) void fetchAudio(chunks[0], style);
}

function playUrl(url: string, mine: number): Promise<void> {
  return new Promise((resolve) => {
    if (mine !== generation) return resolve();
    const p = getPlayer();
    if (!p) return resolve();
    const done = () => { p.onended = null; p.onerror = null; resolve(); };
    p.onended = done;
    p.onerror = done;
    p.src = url;
    p.play().catch(done);
  });
}

/**
 * Lee el texto como guía. Una llamada nueva o stopSpeaking() interrumpe la lectura en curso.
 * `pauseMs` deja silencio entre fragmentos (meditaciones).
 */
export async function speak(text: string, opts?: Opts & { voice?: string }) {
  if (!supported()) return;
  // Si se llama desde un toque (Escuchar, Probar voz), esta línea síncrona desbloquea el audio en iOS.
  if (!isUnlocked()) unlockAudio();
  stopCurrent();
  const mine = ++generation;
  const style = opts?.style ?? 'guide';
  const chunks = chunkForVoice(text.slice(0, 6000));
  if (!chunks.length) return;
  speaking = true;
  try {
    let next = fetchAudio(chunks[0]!, style, opts?.voice);
    for (let i = 0; i < chunks.length; i++) {
      const url = await next;
      if (mine !== generation) return;
      if (i + 1 < chunks.length) next = fetchAudio(chunks[i + 1]!, style, opts?.voice); // el siguiente se prepara mientras suena este
      if (url) await playUrl(url, mine);
      else await browserSpeak(chunks[i]!, mine, opts?.rate ?? (style === 'calm' || style === 'breath' ? 0.85 : 1));
      if (opts?.pauseMs && mine === generation && i + 1 < chunks.length) await new Promise((r) => setTimeout(r, opts.pauseMs));
    }
  } finally {
    if (mine === generation) speaking = false;
  }
}

/** Indicación breve (Inhala, Exhala…): no interrumpe una explicación en curso. */
export function cue(text: string, style: VoiceStyle = 'breath') {
  if (speaking) return;
  void speak(text, { style });
}

function stopCurrent() {
  const p = getPlayer();
  if (p && !p.paused) p.pause();
  if (supported() && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export function stopSpeaking() {
  generation++;
  speaking = false;
  stopCurrent();
}

// ---------- Respaldo: voz del navegador ----------
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const list = window.speechSynthesis.getVoices();
    if (list.length) return resolve(list);
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

async function browserSpeak(text: string, mine: number, rate: number) {
  if (!('speechSynthesis' in window)) return;
  const all = await loadVoices();
  const voice = all.find((v) => /natural|neural|online/i.test(v.name) && v.lang.toLowerCase().startsWith('es'))
    ?? all.find((v) => v.lang === 'es-MX') ?? all.find((v) => v.lang.toLowerCase().startsWith('es')) ?? null;
  for (const part of splitForSpeech(text)) {
    if (mine !== generation) return;
    const u = new SpeechSynthesisUtterance(part);
    u.lang = voice?.lang ?? 'es-MX';
    if (voice) u.voice = voice;
    u.rate = rate;
    await new Promise<void>((resolve) => { u.onend = () => resolve(); u.onerror = () => resolve(); window.speechSynthesis.speak(u); });
  }
}
