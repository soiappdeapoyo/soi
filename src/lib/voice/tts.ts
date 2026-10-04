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

/** Divide en frases de ≤ 220 caracteres: Chrome corta las locuciones largas (~15 s) y así se puede pausar entre frases. */
export function splitForSpeech(text: string, max = 220): string[] {
  const clean = text.replace(/[*_#>`\[\]()]/g, '').replace(/\s+/g, ' ').trim();
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

let generation = 0;

/**
 * Lee el texto completo, frase por frase. `pauseMs` deja silencio entre frases (meditaciones guiadas).
 * Una llamada nueva o stopSpeaking() interrumpe la lectura en curso.
 */
export async function speak(text: string, opts?: { voice?: string; rate?: number; pauseMs?: number }) {
  if (!supported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const mine = ++generation;
  const parts = splitForSpeech(text.slice(0, 6000));
  if (!parts.length) return;
  const voice = pickVoice(await loadVoices(), opts?.voice ?? DEFAULT_VOICE);

  for (const part of parts) {
    if (mine !== generation) return;
    const u = new SpeechSynthesisUtterance(part);
    u.lang = voice?.lang ?? 'es-MX';
    if (voice) u.voice = voice;
    u.rate = opts?.rate ?? 1;
    await new Promise<void>((resolve) => {
      u.onend = () => resolve();
      u.onerror = () => resolve();
      synth.speak(u);
    });
    if (opts?.pauseMs && mine === generation) await new Promise((r) => setTimeout(r, opts.pauseMs));
  }
}

export function stopSpeaking() {
  generation++;
  if (supported()) window.speechSynthesis.cancel();
}
