'use client';

/**
 * TTS con Web Speech API (sin dependencias).
 * En Microsoft Edge expone voces neuronales (ej. "Microsoft Dalia Online (Natural)").
 * En otros navegadores usa la mejor voz en español disponible.
 * TTS solo trial/SOI+: el llamador verifica acceso ('tts').
 */

export const VOICES = [
  { id: 'es-MX-DaliaNeural', label: 'Dalia (México)', match: 'Dalia', lang: 'es-MX' },
  { id: 'es-MX-JorgeNeural', label: 'Jorge (México)', match: 'Jorge', lang: 'es-MX' },
  { id: 'es-CO-SalomeNeural', label: 'Salomé (Colombia)', match: 'Salome', lang: 'es-CO' },
  { id: 'es-AR-ElenaNeural', label: 'Elena (Argentina)', match: 'Elena', lang: 'es-AR' },
  { id: 'es-ES-ElviraNeural', label: 'Elvira (España)', match: 'Elvira', lang: 'es-ES' },
  { id: 'es-US-PalomaNeural', label: 'Paloma (EE. UU.)', match: 'Paloma', lang: 'es-US' },
] as const;

const DEFAULT_VOICE = 'es-MX-DaliaNeural';

function supported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Las voces cargan de forma asíncrona en algunos navegadores. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const list = window.speechSynthesis.getVoices();
    if (list.length) return resolve(list);
    const done = () => resolve(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
    setTimeout(done, 1500);
  });
}

function pickVoice(all: SpeechSynthesisVoice[], id: string) {
  const cfg = VOICES.find((v) => v.id === id) ?? VOICES[0];
  const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return (
    all.find((v) => norm(v.name).includes(norm(cfg.match))) ??
    all.find((v) => v.lang === cfg.lang) ??
    all.find((v) => v.lang.toLowerCase().startsWith('es')) ??
    null
  );
}

export async function speak(text: string, opts?: { voice?: string; rate?: number }) {
  if (!supported()) return;
  const plain = text.replace(/[*_#>`\[\]()]/g, '').slice(0, 1500);
  const synth = window.speechSynthesis;
  synth.cancel();

  const voice = pickVoice(await loadVoices(), opts?.voice ?? DEFAULT_VOICE);
  const u = new SpeechSynthesisUtterance(plain);
  u.lang = voice?.lang ?? 'es-MX';
  if (voice) u.voice = voice;
  u.rate = opts?.rate ?? 1;

  await new Promise<void>((resolve) => {
    u.onend = () => resolve();
    u.onerror = () => resolve();
    synth.speak(u);
  });
}

export function stopSpeaking() {
  if (supported()) window.speechSynthesis.cancel();
}
