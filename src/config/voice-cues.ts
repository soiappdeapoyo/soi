import type { VoiceStyle } from '@/config/voices';

/**
 * Indicaciones fijas de la guía (Inhala, Exhala, "Diez segundos más"…): el mismo texto para todas las personas.
 * Se generan UNA vez por voz, se guardan en `voice-cache/cues/` y se sirven públicas con caché inmutable
 * (`/api/voice/cue/<voz>/<id>`): después de la primera vez salen del CDN y del navegador, sin esperar a la IA.
 */
export const VOICE_CUES = {
  inhala: { text: 'Inhala…', style: 'breath' },
  sosten: { text: 'Sostén…', style: 'breath' },
  exhala: { text: 'Exhala…', style: 'breath' },
  pausa: { text: 'Pausa…', style: 'breath' },
  diez: { text: 'Diez segundos más.', style: 'guide' },
  vuelve: { text: 'Poco a poco, vuelve a este momento.', style: 'calm' },
  mente: { text: 'Si tu mente se fue, no pasa nada. Vuelve con suavidad a tu respiración.', style: 'calm' },
} as const satisfies Record<string, { text: string; style: VoiceStyle }>;
export type VoiceCueId = keyof typeof VOICE_CUES;

/** Cambia si cambia el texto o la instrucción de una indicación: la URL nueva no usa el audio anterior. */
export const VOICE_CUE_VERSION = 1;

/**
 * Instrucción de las palabras de respiración. La del estilo `breath` ("alargando las vocales, acompañando el ritmo")
 * podía producir un soplido o un audio casi sin palabra: aquí se pide la palabra, clara y corta.
 */
export const BREATH_CUE_INSTRUCTIONS = 'Guía de respiración en español latinoamericano. Di únicamente la palabra, clara y audible, en voz suave y serena, alargando apenas la última vocal. No respires ni hagas sonidos de respiración. Sin silencio antes ni después.';

export function cueIdFor(text: string, style: VoiceStyle): VoiceCueId | null {
  const t = text.trim();
  for (const [id, c] of Object.entries(VOICE_CUES)) if (c.text === t && c.style === style) return id as VoiceCueId;
  return null;
}

export const cueUrl = (voice: string, id: VoiceCueId) => `/api/voice/cue/${voice}/${id}?v=${VOICE_CUE_VERSION}`;
