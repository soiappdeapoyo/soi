import { createHash } from 'node:crypto';
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { google } from '@ai-sdk/google';
import { Mp3Encoder } from '@breezystack/lamejs';
import { createAdminClient } from '@/lib/supabase/server';
import { VOICE_STYLES, VOICE_STYLE_VERSION, guideVoice, type VoiceStyle } from '@/config/voices';

/** Modelo de voz configurable (los proveedores cambian de modelo: una variable, sin deploy de código). */
export const TTS_MODEL = process.env.AI_MODEL_TTS || 'gemini-3.8-flash-tts';
/** El mismo modelo por OpenRouter (principal): mismas voces y estilos, por eso comparte la caché. */
export const OPENROUTER_TTS_MODEL = process.env.AI_MODEL_TTS_OPENROUTER || `google/${TTS_MODEL}`;
const OPENROUTER_SPEECH_URL = 'https://openrouter.ai/api/v1/audio/speech';

/** Hay con qué generar voz: OpenRouter (principal) o Google directo (respaldo). */
export function hasTtsProvider(env: Record<string, string | undefined> = process.env) {
  return Boolean(env.OPENROUTER_API_KEY?.trim() || env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
}
const SAMPLE_RATE = 24_000;
const BUCKET = 'voice-cache';

export function normalizeSpeech(text: string) {
  return text.replace(/[*_#>`\[\]()]/g, '').replace(/\s+/g, ' ').trim().slice(0, 1500);
}

export function voiceKey(text: string, voice: string, style: VoiceStyle) {
  return createHash('sha256').update(`${TTS_MODEL}|v${VOICE_STYLE_VERSION}|${voice}|${style}|${text}`).digest('hex');
}

/** WAV (RIFF) → PCM de 16 bits. Gemini devuelve 24 kHz mono. */
export function pcmFromWav(bytes: Uint8Array): Int16Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  if (String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF') return new Int16Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength - (bytes.byteLength % 2)));
  while (offset + 8 <= bytes.length) {
    const id = String.fromCharCode(...bytes.slice(offset, offset + 4));
    const size = view.getUint32(offset + 4, true);
    if (id === 'data') return new Int16Array(bytes.buffer.slice(bytes.byteOffset + offset + 8, bytes.byteOffset + offset + 8 + size - (size % 2)));
    offset += 8 + size + (size % 2);
  }
  return new Int16Array(0);
}

/** PCM → MP3 mono 64 kbps (~0,5 MB por minuto, frente a ~2,9 MB del WAV). */
export function encodeMp3(pcm: Int16Array, sampleRate = SAMPLE_RATE): Uint8Array {
  const enc = new Mp3Encoder(1, sampleRate, 64);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < pcm.length; i += 1152) {
    const out = enc.encodeBuffer(pcm.subarray(i, i + 1152));
    if (out.length) chunks.push(new Uint8Array(out));
  }
  const end = enc.flush();
  if (end.length) chunks.push(new Uint8Array(end));
  const total = chunks.reduce((a, c) => a + c.length, 0);
  const mp3 = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { mp3.set(c, o); o += c.length; }
  return mp3;
}

export async function cachedVoice(key: string): Promise<Uint8Array | null> {
  const { data } = await createAdminClient().storage.from(BUCKET).download(`${key}.mp3`);
  return data ? new Uint8Array(await data.arrayBuffer()) : null;
}

/** Gemini TTS por OpenRouter: PCM crudo de 16 bits, 24 kHz mono. */
export async function speechViaOpenRouter(text: string, voice: string, style: VoiceStyle, fetchImpl: typeof fetch = fetch): Promise<Int16Array> {
  const res = await fetchImpl(OPENROUTER_SPEECH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'X-Title': 'SOI',
    },
    body: JSON.stringify({ model: OPENROUTER_TTS_MODEL, input: text, voice, instructions: VOICE_STYLES[style], response_format: 'pcm' }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  return pcmFromWav(new Uint8Array(await res.arrayBuffer()));
}

async function speechViaGoogle(text: string, voice: string, style: VoiceStyle): Promise<Int16Array> {
  const { audio } = await generateSpeech({
    model: google.speech(TTS_MODEL),
    text,
    voice,
    instructions: VOICE_STYLES[style],
    outputFormat: 'wav',
    abortSignal: AbortSignal.timeout(45_000),
    maxRetries: 1,
  });
  return pcmFromWav(audio.uint8Array);
}

/**
 * Genera la locución con la voz y el estilo de la guía y la guarda en caché. Devuelve MP3 y segundos.
 * OpenRouter primero (se paga con sus créditos); si falla o no hay clave, Google directo.
 */
export async function synthesize(text: string, voiceId: string | null | undefined, style: VoiceStyle) {
  const voice = guideVoice(voiceId);
  const providers: [string, () => Promise<Int16Array>][] = [];
  if (process.env.OPENROUTER_API_KEY?.trim()) providers.push(['openrouter', () => speechViaOpenRouter(text, voice, style)]);
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) providers.push(['google', () => speechViaGoogle(text, voice, style)]);

  let pcm: Int16Array | null = null;
  const errors: string[] = [];
  for (const [name, run] of providers) {
    try {
      pcm = await run();
      if (pcm.length) break;
      errors.push(`${name}: audio vacío`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[tts] ${name} falló: ${message}`);
      errors.push(`${name}: ${message}`);
    }
    pcm = null;
  }
  if (!pcm) throw new Error(errors.join(' · ') || 'sin proveedor de voz');

  const mp3 = encodeMp3(pcm);
  const key = voiceKey(text, voice, style);
  await createAdminClient().storage.from(BUCKET).upload(`${key}.mp3`, mp3, { contentType: 'audio/mpeg', upsert: true });
  return { mp3, seconds: Math.ceil(pcm.length / SAMPLE_RATE), key };
}
