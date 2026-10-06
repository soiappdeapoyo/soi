import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, getProfile } from '@/lib/billing/check-access';
import { hasKey } from '@/lib/ai/models';
import { cachedVoice, normalizeSpeech, synthesize, voiceKey } from '@/lib/voice/server';
import { guideVoice, VOICE_STYLES, type VoiceStyle } from '@/config/voices';

export const maxDuration = 60;

const Body = z.object({
  text: z.string().min(1).max(2000),
  style: z.enum(Object.keys(VOICE_STYLES) as [VoiceStyle, ...VoiceStyle[]]).default('guide'),
  /** Solo calentar la caché (prefetch del siguiente paso): no devuelve audio. */
  prefetch: z.boolean().optional(),
  /** Para "Probar voz" en Ajustes antes de guardar; si no, la voz del perfil. */
  voice: z.string().max(40).optional(),
});

/** Tope de audio NUEVO por persona y día (lo servido desde caché no cuenta). 20 min ≈ $0.27 en 2026. */
const DAILY_SECONDS = 20 * 60;

/**
 * Voz guía neuronal (Gemini TTS). Caché por texto + voz + estilo: lo que ya se generó (para cualquier
 * persona) se sirve sin costo. Sin acceso (Free), sin clave o sobre el tope: 204 y el cliente usa la voz del navegador.
 */
export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  if (!hasKey('gemini')) return new Response(null, { status: 204 });
  if (!(await canAccess(user.id, 'tts')).allowed) return new Response(null, { status: 204 });

  const text = normalizeSpeech(parsed.data.text);
  if (!text) return new Response(null, { status: 204 });
  const style = parsed.data.style;
  const profile = await getProfile(user.id);
  const voice = guideVoice(parsed.data.voice ?? profile?.voice_preference);
  const key = voiceKey(text, voice, style);

  const hit = await cachedVoice(key);
  if (hit) return parsed.data.prefetch ? new Response(null, { status: 204 }) : audioResponse(hit);

  const { data: today } = await supabase.from('tts_usage').select('seconds').eq('user_id', user.id).eq('day', new Date().toISOString().slice(0, 10)).maybeSingle();
  if ((today?.seconds ?? 0) >= DAILY_SECONDS) return new Response(null, { status: 204, headers: { 'x-soi-tts': 'limit' } });

  try {
    const { mp3, seconds } = await synthesize(text, voice, style);
    await supabase.rpc('add_tts_seconds', { p_seconds: Math.min(600, seconds) });
    return parsed.data.prefetch ? new Response(null, { status: 204 }) : audioResponse(mp3);
  } catch (error) {
    console.error('[tts]', error instanceof Error ? error.message : error);
    return new Response(null, { status: 204, headers: { 'x-soi-tts': 'error' } });
  }
}

function audioResponse(mp3: Uint8Array) {
  return new Response(mp3 as unknown as BodyInit, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=86400' } });
}
