import { createHash } from 'node:crypto';
import { experimental_generateSpeech as generateSpeech } from 'ai';
import { google } from '@ai-sdk/google';
import { Mp3Encoder } from '@breezystack/lamejs';
import { createAdminClient } from '@/lib/supabase/server';
import { VOICE_STYLES, VOICE_STYLE_VERSION, guideVoice, type VoiceStyle } from '@/config/voices';

/** Modelo de voz configurable (los proveedores cambian de modelo: una variable, sin deploy de código). */
export const TTS_MODEL = process.env.AI_MODEL_TTS || 'gemini-3.8-flash-tts';
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

/** Genera la locución con la voz y el estilo de la guía y la guarda en caché. Devuelve MP3 y segundos. */
export async function synthesize(text: string, voiceId: string | null | undefined, style: VoiceStyle) {
  const voice = guideVoice(voiceId);
  const { audio } = await generateSpeech({
    model: google.speech(TTS_MODEL),
    text,
    voice,
    instructions: VOICE_STYLES[style],
    outputFormat: 'wav',
    abortSignal: AbortSignal.timeout(45_000),
    maxRetries: 1,
  });
  const pcm = pcmFromWav(audio.uint8Array);
  if (!pcm.length) throw new Error('audio vacío');
  const mp3 = encodeMp3(pcm);
  const key = voiceKey(text, voice, style);
  await createAdminClient().storage.from(BUCKET).upload(`${key}.mp3`, mp3, { contentType: 'audio/mpeg', upsert: true });
  return { mp3, seconds: Math.ceil(pcm.length / SAMPLE_RATE), key };
}
