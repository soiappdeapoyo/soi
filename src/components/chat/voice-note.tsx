'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { track } from '@/components/providers/analytics';
import { cn } from '@/lib/utils';

/** Barras fijas de la "onda" (decorativas): cada nota tiene su forma según el texto. */
function barsFor(text: string, n = 28): number[] {
  let h = 7;
  return Array.from({ length: n }, (_, i) => {
    h = (h * 31 + (text.charCodeAt(i % Math.max(1, text.length)) || 3)) % 997;
    return 0.3 + ((h % 70) / 100);
  });
}

/** Duración aproximada al hablar (≈ 2.6 palabras por segundo, con respiraciones). */
const secondsFor = (text: string) => Math.max(3, Math.round(text.split(/\s+/).length / 2.6));
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/**
 * Nota de voz de SOI, como un audio de WhatsApp: la voz neuronal con estilo «note» (cercana, con respiraciones).
 * Mientras suena, la pantalla bloqueada del teléfono muestra la frase (Media Session), igual que el reproductor de
 * un Moment. `autoPlay` solo después de un toque de la persona (enviar un mensaje): si no, espera a que la toque.
 */
export function VoiceNote({ text, autoPlay = false }: { text: string; autoPlay?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(false);
  const started = useRef(false);
  const bars = barsFor(text);
  const seconds = secondsFor(text);
  const clean = text.replace(/[*_#>`]/g, '').replace(/\s+/g, ' ').trim();

  async function play() {
    const { speak, stopSpeaking, unlockAudio } = await import('@/lib/voice/tts');
    if (playing) { stopSpeaking(); setPlaying(false); return; }
    unlockAudio();
    setPlaying(true);
    track('coach_voice_note', { action: 'play' });
    // La pantalla bloqueada muestra la frase de SOI mientras suena (como el reproductor de un Moment).
    try {
      if ('mediaSession' in navigator) {
        const first = clean.split(/(?<=[.!?…])\s/)[0] ?? clean;
        navigator.mediaSession.metadata = new MediaMetadata({
          title: first.slice(0, 90), artist: 'SOI · nota de voz', album: 'SOI',
          artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
        });
        navigator.mediaSession.setActionHandler('pause', () => { stopSpeaking(); setPlaying(false); });
      }
    } catch { /* sin Media Session */ }
    await speak(clean, { style: 'note' });
    setPlaying(false);
    try { if ('mediaSession' in navigator) navigator.mediaSession.metadata = null; } catch { /* nada */ }
  }

  useEffect(() => {
    if (!autoPlay || started.current) return;
    started.current = true;
    void play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  return (
    <div className="my-1 max-w-sm">
      <div className="flex items-center gap-3 rounded-[18px] bg-white px-3 py-2.5 shadow-ring">
        <button type="button" onClick={() => void play()} aria-label={playing ? 'Pausar nota de voz' : 'Escuchar nota de voz'}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soi-ink text-white">
          {playing ? <Pause className="h-4 w-4 fill-current" aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />}
        </button>
        <div aria-hidden="true" className="flex h-8 flex-1 items-center gap-[3px]">
          {bars.map((b, i) => (
            <span key={i} style={{ transform: `scaleY(${b})`, animationDelay: `${(i % 7) * 90}ms` }}
              className={cn('h-full w-[3px] origin-center rounded-full', playing ? 'animate-pulse bg-soi-ink motion-reduce:animate-none' : 'bg-soi-ink/30')} />
          ))}
        </div>
        <span className="nums shrink-0 text-xs text-soi-muted">{mmss(seconds)}</span>
      </div>
      <button type="button" onClick={() => setShown((v) => !v)} className="press mt-1 rounded px-1 py-1 text-xs text-soi-muted hover:text-soi-ink" aria-expanded={shown}>
        {shown ? 'Ocultar lo que dijo' : 'Ver lo que dijo'}
      </button>
      {shown && <p className="mt-0.5 whitespace-pre-line text-[15px] leading-relaxed text-soi-ink">{text}</p>}
    </div>
  );
}
