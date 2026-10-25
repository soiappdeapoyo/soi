'use client';

import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { hash } from '@/lib/persons/spec';
import { voiceSeconds } from '@/lib/persons/scheduler';

const TRANSCRIPT_KEY = 'persons:transcripts';
const SPEEDS = [1, 1.5, 2] as const;

function readPref() {
  try { return localStorage.getItem(TRANSCRIPT_KEY) === '1'; } catch { return false; }
}

/**
 * Nota de voz del personaje: play, forma de onda fija (se llena al reproducir), duración, velocidad 1x/1.5x/2x y
 * transcripción (accesibilidad; la preferencia se recuerda). Nunca se reproduce sola. El audio se pide al tocar play;
 * sin voz disponible, se muestra la transcripción.
 */
export function VoiceBubble({ personaId, messageId, text, onHeard }: { personaId: string; messageId: string; text: string; onHeard?: () => void }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'paused' | 'unavailable'>('idle');
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(voiceSeconds(text));
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [transcript, setTranscript] = useState(false);
  useEffect(() => { setTranscript(readPref()); }, []);
  useEffect(() => () => { audio.current?.pause(); if (audio.current?.src.startsWith('blob:')) URL.revokeObjectURL(audio.current.src); }, []);

  const seed = hash(messageId);
  const bars = Array.from({ length: 28 }, (_, i) => 0.25 + (((seed >> (i % 24)) ^ (i * 2654435761)) >>> 0) % 75 / 100);

  async function toggle() {
    if (state === 'playing') { audio.current?.pause(); return; }
    if (audio.current) { await audio.current.play().catch(() => {}); return; }
    setState('loading');
    try {
      const res = await fetch(`/api/persons/${personaId}/voice/${messageId}`);
      onHeard?.();
      if (res.status !== 200) { setState('unavailable'); setTranscript(true); return; }
      const url = URL.createObjectURL(await res.blob());
      const a = new Audio(url);
      a.playbackRate = speed;
      a.onloadedmetadata = () => { if (Number.isFinite(a.duration)) setDuration(Math.round(a.duration)); };
      a.ontimeupdate = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
      a.onplay = () => setState('playing');
      a.onpause = () => setState('paused');
      a.onended = () => { setState('paused'); setProgress(0); };
      audio.current = a;
      await a.play();
    } catch {
      setState('unavailable');
      setTranscript(true);
    }
  }

  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]!;
    setSpeed(next);
    if (audio.current) audio.current.playbackRate = next;
  }

  function toggleTranscript() {
    const v = !transcript;
    setTranscript(v);
    try { localStorage.setItem(TRANSCRIPT_KEY, v ? '1' : '0'); } catch { /* sin almacenamiento */ }
  }

  const secs = state === 'playing' || progress > 0 ? Math.round(duration * progress) : duration;
  return (
    <div className="w-[240px] max-w-full">
      <div className="flex items-center gap-2">
        <button
          type="button" onClick={toggle} disabled={state === 'loading' || state === 'unavailable'}
          aria-label={state === 'playing' ? 'Pausar nota de voz' : 'Reproducir nota de voz'}
          className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#54656F] text-white disabled:opacity-60"
        >
          {state === 'playing' ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4" aria-hidden="true" />}
        </button>
        <span className="flex h-8 flex-1 items-center gap-[2px]" aria-hidden="true">
          {bars.map((b, i) => (
            <span key={i} className="w-[3px] rounded-full" style={{ height: `${Math.round(b * 100)}%`, background: i / bars.length <= progress ? '#4FA3D1' : '#B5BFC4' }} />
          ))}
        </span>
        <button type="button" onClick={cycleSpeed} className="press nums h-7 shrink-0 rounded-full bg-black/[0.06] px-2 text-xs font-semibold text-[#3B4A54]" aria-label={`Velocidad ${speed}x`}>
          {speed}x
        </button>
      </div>
      <div className="mt-1 flex items-center justify-between pl-12 text-xs text-[#556770]">
        <span className="nums">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</span>
        <button type="button" onClick={toggleTranscript} className="underline-offset-2 hover:underline" aria-expanded={transcript}>
          {transcript ? 'Ocultar texto' : 'Ver texto'}
        </button>
      </div>
      {transcript && <p className="mt-1.5 text-[14.5px] leading-snug text-[#111B21]">{state === 'unavailable' && <span className="block text-xs text-[#556770]">Audio no disponible: esto es lo que dijo.</span>}{text}</p>}
    </div>
  );
}
