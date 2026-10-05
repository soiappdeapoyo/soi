/**
 * Voces de la guía (Gemini TTS, neuronales). El carácter viene de la documentación de Google;
 * elegimos las que suenan cercanas y serenas para acompañar.
 */
export const GUIDE_VOICES = [
  { id: 'Sulafat', label: 'Sulafat', detail: 'Cálida' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix', detail: 'Suave' },
  { id: 'Achernar', label: 'Achernar', detail: 'Serena' },
  { id: 'Enceladus', label: 'Enceladus', detail: 'Susurrante' },
  { id: 'Algieba', label: 'Algieba', detail: 'Fluida' },
  { id: 'Achird', label: 'Achird', detail: 'Amigable' },
] as const;
export type GuideVoice = (typeof GUIDE_VOICES)[number]['id'];
export const DEFAULT_GUIDE_VOICE: GuideVoice = 'Sulafat';

export function guideVoice(v: string | null | undefined): GuideVoice {
  return (GUIDE_VOICES.find((x) => x.id === v)?.id ?? DEFAULT_GUIDE_VOICE) as GuideVoice;
}

/** Cómo habla la guía según el momento. Se envía como instrucción de estilo (no se lee en voz alta). */
export const VOICE_STYLES = {
  guide: 'Eres una guía de bienestar que habla español latinoamericano neutro. Voz cálida, cercana y serena, ritmo tranquilo pero continuo, con pausas breves y naturales en los puntos (como al hablar, no al leer). Suena humana y presente, nunca robótica ni comercial.',
  calm: 'Eres una guía de meditación en español latinoamericano neutro. Habla despacio, en voz baja y suave, con un flujo continuo y pausas breves y naturales en los puntos, sin silencios largos. Transmite calma y seguridad.',
  breath: 'Guía de respiración en español latinoamericano. Di solo la palabra, alargando las vocales, muy suave, acompañando el ritmo de la respiración, sin silencio antes ni después.',
  energy: 'Eres una entrenadora amable que habla español latinoamericano neutro. Voz clara, con energía positiva y motivadora, ritmo ágil pero sin gritar. Celebra el esfuerzo.',
  chat: 'Eres SOI, una compañera que habla español latinoamericano neutro. Tono conversacional, cálido y natural, como una amiga que acompaña.',
} as const;
export type VoiceStyle = keyof typeof VOICE_STYLES;

/** Cambia cuando cambia el estilo: el audio en caché con el estilo anterior deja de usarse. */
export const VOICE_STYLE_VERSION = 2;
