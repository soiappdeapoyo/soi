import { BREATH_CUE_INSTRUCTIONS, VOICE_CUES, VOICE_CUE_VERSION, type VoiceCueId } from '@/config/voice-cues';
import { GUIDE_VOICES } from '@/config/voices';
import { cachedVoice, hasTtsProvider, synthesize } from '@/lib/voice/server';

export const maxDuration = 60;

/**
 * Indicación fija de la guía (Inhala, Exhala…) con una voz: la misma para todas las personas.
 * Se genera una sola vez (la primera persona que la pide) y se guarda en `voice-cache/cues/v<n>/<voz>/<id>.mp3`;
 * después sale del CDN y de la caché del navegador. Pública y sin sesión: solo textos de la lista, costo acotado
 * (6 voces × 7 indicaciones) y sin datos de nadie.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ voice: string; cue: string }> }) {
  const { voice, cue } = await params;
  if (!GUIDE_VOICES.some((v) => v.id === voice) || !(cue in VOICE_CUES)) return new Response('No encontrado', { status: 404 });
  const c = VOICE_CUES[cue as VoiceCueId];
  const path = `cues/v${VOICE_CUE_VERSION}/${voice}/${cue}`;

  let mp3 = await cachedVoice(path);
  if (!mp3) {
    if (!hasTtsProvider()) return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    try {
      mp3 = (await synthesize(c.text, voice, c.style, { path, ...(c.style === 'breath' ? { instructions: BREATH_CUE_INSTRUCTIONS } : {}) })).mp3;
    } catch (error) {
      console.error('[tts] indicación', path, error instanceof Error ? error.message : error);
      return new Response(null, { status: 503, headers: { 'Cache-Control': 'no-store' } });
    }
  }
  return new Response(mp3 as unknown as BodyInit, {
    headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable' },
  });
}
