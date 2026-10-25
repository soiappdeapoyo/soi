import { createHash } from 'node:crypto';
import { after } from 'next/server';
import { createAdminClient, getSessionUser } from '@/lib/supabase/server';
import { loadPersona, personsApiSession } from '@/lib/persons/server';
import { cachedVoice, hasTtsProvider, normalizeSpeech, synthesize, TTS_MODEL } from '@/lib/voice/server';
import { getSettings } from '@/lib/settings';
import type { EmotionSnapshot } from '@/lib/persons/emotion';

export const maxDuration = 60;

/** Cómo suena una nota de voz: su tono y su ánimo de ese momento, en palabras (sin llanto, suspiros ni sonidos). */
function voiceInstructions(gender: string, tone: string, emotion: EmotionSnapshot | null) {
  const mood = !emotion ? 'natural'
    : emotion.label === 'excited' ? 'con energía y una sonrisa en la voz'
    : emotion.label === 'warm' ? 'cálido y relajado'
    : emotion.label === 'tired' ? 'con poca energía, más lento'
    : emotion.label === 'annoyed' ? 'seco y breve, sin agresividad'
    : emotion.label === 'busy' ? 'con prisa, como quien va haciendo algo'
    : 'tranquilo';
  const who = gender === 'masculino' ? 'un hombre' : gender === 'femenino' ? 'una mujer' : 'una persona';
  return `Eres ${who} adulto que manda una nota de voz por WhatsApp a alguien que conoció hace poco, en español latinoamericano. Habla como en una conversación real, no como locutor: tono ${tone}, ${mood}. Di solo las palabras del texto; nada de risas forzadas, suspiros, llanto ni sonidos.`;
}

/**
 * Audio de una nota de voz del personaje (Gemini TTS con su voz fija). Se genera la primera vez que se reproduce y
 * queda en caché (`voice-cache/persons/…`); cuenta para el tope diario de voz. Sin acceso o sin voz: 204 y el cliente
 * muestra la transcripción.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const { id, messageId } = await params;
  const persona = await loadPersona(s.userId, id);
  if (!persona || !/^[0-9a-f-]{36}$/i.test(messageId)) return new Response(null, { status: 404 });
  const db = createAdminClient();
  const { data: msg } = await db.from('persona_messages').select('id, content, kind, emotion, deliver_at')
    .eq('id', messageId).eq('persona_id', persona.id).eq('role', 'persona').lte('deliver_at', new Date().toISOString()).maybeSingle();
  if (!msg || msg.kind !== 'voice') return new Response(null, { status: 404 });
  after(async () => { await db.from('persona_messages').update({ heard_at: new Date().toISOString() }).eq('id', msg.id).is('heard_at', null); });
  if (!s.limits.voice || !hasTtsProvider()) return new Response(null, { status: 204 });

  const text = normalizeSpeech(msg.content as string);
  const emotion = (msg.emotion as EmotionSnapshot | null) ?? null;
  const instructions = voiceInstructions(persona.gender, persona.spec.tone, emotion);
  const voice = persona.voice ?? persona.spec.derived.voice;
  const path = `persons/${createHash('sha256').update(`${TTS_MODEL}|${voice}|${instructions}|${text}`).digest('hex')}`;
  const hit = await cachedVoice(path);
  if (hit) return audio(hit);

  const { supabase } = await getSessionUser();
  const [usage, settings] = await Promise.all([
    supabase.from('tts_usage').select('seconds').eq('user_id', s.userId).eq('day', new Date().toISOString().slice(0, 10)).maybeSingle(),
    getSettings(),
  ]);
  if ((usage.data?.seconds ?? 0) >= settings.ttsDailyMinutes * 60) return new Response(null, { status: 204, headers: { 'x-soi-tts': 'limit' } });
  try {
    const { mp3, seconds, store } = await synthesize(text, voice, 'chat', { instructions, path, deferStore: true });
    after(() => Promise.all([store(), supabase.rpc('add_tts_seconds', { p_seconds: Math.min(120, seconds) })]).then(() => undefined, (e) => console.error('[persons] voz', e)));
    return audio(mp3);
  } catch (error) {
    console.error('[persons] voz', error instanceof Error ? error.message : error);
    return new Response(null, { status: 204, headers: { 'x-soi-tts': 'error' } });
  }
}

function audio(mp3: Uint8Array) {
  return new Response(mp3 as unknown as BodyInit, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=604800' } });
}
