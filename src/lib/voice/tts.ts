'use client';
import { VoiPi } from 'voipi';

let instance: VoiPi | null = null;

export function getVoice() {
  if (!instance) {
    instance = new VoiPi({
      providers: ['edge-tts', 'browser-tts'],
      defaultVoice: 'es-MX-DaliaNeural',
    });
  }
  return instance;
}

/** TTS solo trial/SOI+: el llamador verifica acceso ('tts'). */
export async function speak(text: string, opts?: { voice?: string; rate?: number }) {
  const plain = text.replace(/[*_#>`\[\]()]/g, '').slice(0, 1500);
  try {
    await getVoice().speak(plain, {
      voice: opts?.voice ?? 'es-MX-DaliaNeural',
      rate: opts?.rate ?? 1.0,
    });
  } catch {
    // Fallback nativo del navegador
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(plain);
      u.lang = 'es-MX';
      u.rate = opts?.rate ?? 1;
      window.speechSynthesis.speak(u);
    }
  }
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}

export const VOICES = [
  { id: 'es-MX-DaliaNeural', label: 'Dalia (México)' },
  { id: 'es-MX-JorgeNeural', label: 'Jorge (México)' },
  { id: 'es-CO-SalomeNeural', label: 'Salomé (Colombia)' },
  { id: 'es-AR-ElenaNeural', label: 'Elena (Argentina)' },
  { id: 'es-ES-ElviraNeural', label: 'Elvira (España)' },
  { id: 'es-US-PalomaNeural', label: 'Paloma (EE. UU.)' },
] as const;
