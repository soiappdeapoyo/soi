import { describe, it, expect, vi } from 'vitest';
import { chunkForVoice } from '@/lib/voice/tts';
import { blockSpeech } from '@/lib/moments/speech';
import { guideVoice } from '@/config/voices';

vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));

function wav(samples: Int16Array, rate = 24_000) {
  const buf = new ArrayBuffer(44 + samples.byteLength);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + samples.byteLength, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, samples.byteLength, true);
  new Int16Array(buf, 44).set(samples);
  return new Uint8Array(buf);
}

describe('voz guía (servidor)', () => {
  it('lee el PCM de un WAV y lo convierte a MP3 válido y mucho más liviano', async () => {
    const { pcmFromWav, encodeMp3, voiceKey } = await import('@/lib/voice/server');
    const tone = Int16Array.from({ length: 24_000 }, (_, i) => Math.round(Math.sin(i / 10) * 8000));
    const pcm = pcmFromWav(wav(tone));
    expect(pcm.length).toBe(24_000);
    const mp3 = encodeMp3(pcm);
    expect(mp3[0]).toBe(0xff); // sincronía de trama MP3
    expect(mp3.length).toBeLessThan(wav(tone).length / 4);
    expect(voiceKey('Inhala', 'Sulafat', 'breath')).toBe(voiceKey('Inhala', 'Sulafat', 'breath'));
    expect(voiceKey('Inhala', 'Sulafat', 'breath')).not.toBe(voiceKey('Inhala', 'Sulafat', 'calm'));
  });
});

describe('voz guía (cliente)', () => {
  it('el primer fragmento es corto para empezar rápido', () => {
    const text = `Cierra los ojos. ${'Respira profundo y suelta los hombros. '.repeat(30)}`;
    const chunks = chunkForVoice(text);
    expect(chunks[0]!.length).toBeLessThanOrEqual(140);
    expect(chunks.slice(1).every((c) => c.length <= 260)).toBe(true);
    expect(chunks.join(' ').replace(/\s+/g, ' ').trim()).toBe(text.replace(/\s+/g, ' ').trim());
  });
  it('cada acción tiene el estilo de guía adecuado', () => {
    expect(blockSpeech({ type: 'meditation', title: 'Silencio', config: { guide: 'Cierra los ojos.' } }).style).toBe('calm');
    expect(blockSpeech({ type: 'breathing', title: 'Respira', config: {} }).style).toBe('calm');
    expect(blockSpeech({ type: 'exercise', title: 'Sentadillas', config: { name: 'Sentadillas', sets: 3, reps: 10 } }).style).toBe('energy');
    expect(blockSpeech({ type: 'writing', title: 'Escribe', config: { prompt: '¿Qué sientes?' } }).style).toBe('guide');
  });
  it('voces antiguas del navegador caen en la voz por defecto', () => {
    expect(guideVoice('es-MX-DaliaNeural')).toBe('Sulafat');
    expect(guideVoice('Achernar')).toBe('Achernar');
  });
});

describe('voz guía por OpenRouter', () => {
  it('pide Gemini TTS con la voz, el estilo y PCM, y lee el audio crudo', async () => {
    vi.stubEnv('OPENROUTER_API_KEY', 'sk-or-test');
    const { speechViaOpenRouter, OPENROUTER_TTS_MODEL } = await import('@/lib/voice/server');
    const { VOICE_STYLES } = await import('@/config/voices');
    const samples = Int16Array.from({ length: 480 }, (_, i) => i);
    const fetchMock = vi.fn(async () => new Response(new Uint8Array(samples.buffer), { headers: { 'Content-Type': 'audio/pcm' } }));
    const pcm = await speechViaOpenRouter('Respira', 'Sulafat', 'calm', fetchMock as unknown as typeof fetch);
    expect(pcm).toEqual(samples);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://openrouter.ai/api/v1/audio/speech');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-or-test');
    expect(JSON.parse(init.body as string)).toEqual({
      model: OPENROUTER_TTS_MODEL, input: 'Respira', voice: 'Sulafat', instructions: VOICE_STYLES.calm, response_format: 'pcm',
    });
    expect(OPENROUTER_TTS_MODEL).toBe('google/gemini-3.8-flash-tts');
    vi.unstubAllEnvs();
  });

  it('un error de OpenRouter se lanza con su estado (para pasar al respaldo)', async () => {
    const { speechViaOpenRouter } = await import('@/lib/voice/server');
    const fetchMock = vi.fn(async () => new Response('{"error":"insufficient credits"}', { status: 402 }));
    await expect(speechViaOpenRouter('Hola', 'Sulafat', 'guide', fetchMock as unknown as typeof fetch)).rejects.toThrow(/OpenRouter 402/);
  });

  it('hay voz con cualquiera de las dos claves', async () => {
    const { hasTtsProvider } = await import('@/lib/voice/server');
    expect(hasTtsProvider({ OPENROUTER_API_KEY: 'x' })).toBe(true);
    expect(hasTtsProvider({ GOOGLE_GENERATIVE_AI_API_KEY: 'y' })).toBe(true);
    expect(hasTtsProvider({ OPENROUTER_API_KEY: ' ' })).toBe(false);
  });
});
