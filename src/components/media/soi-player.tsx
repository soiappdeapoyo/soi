'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Play, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/input';
import { REFLECTION_QUESTION } from '@/lib/momentum';

export type SoiVideo = { id: string; title: string; channel: string; thumbnail: string };

type YTPlayer = { destroy: () => void };
type YTNamespace = {
  Player: new (el: HTMLElement, opts: {
    host?: string; videoId: string; playerVars?: Record<string, number | string>;
    events?: { onStateChange?: (e: { data: number }) => void };
  }) => YTPlayer;
  PlayerState: { ENDED: number };
};
declare global {
  interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }
}

let apiPromise: Promise<YTNamespace> | null = null;
/** Carga la IFrame Player API una sola vez y solo cuando alguien da play (Lighthouse). */
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT!); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

type Phase = 'facade' | 'playing' | 'reflect' | 'saved';

/**
 * Inspiración dentro de SOI: sin salir de la app, sin videos sugeridos ni Shorts (rel=0).
 * Al terminar, SOI reaparece con UNA pregunta y la respuesta se guarda como conocimiento estructurado.
 */
export function SoiPlayer({ video, onReflected, startWithReflection = false }: {
  video: SoiVideo; onReflected?: (text: string, video: SoiVideo) => void;
  /** Para retomar la reflexión de un video ya visto (pestaña Hoy). */
  startWithReflection?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>(startWithReflection ? 'reflect' : 'facade');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [momentId, setMomentId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const endedRef = useRef(false);

  useEffect(() => () => playerRef.current?.destroy(), []);

  async function finish() {
    if (endedRef.current) return;
    endedRef.current = true;
    playerRef.current?.destroy();
    playerRef.current = null;
    setPhase('reflect');
    fetch('/api/momentum/video', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId: video.id, title: video.title, channel: video.channel }),
    }).catch(() => {});
  }

  async function play() {
    endedRef.current = false;
    setPhase('playing');
    const YT = await loadYouTubeApi();
    if (!hostRef.current) return;
    // La API reemplaza el nodo por un iframe: usamos un hijo propio, no el div que controla React.
    const mount = document.createElement('div');
    hostRef.current.replaceChildren(mount);
    playerRef.current = new YT.Player(mount, {
      host: 'https://www.youtube-nocookie.com',
      videoId: video.id,
      playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1 },
      events: { onStateChange: (e) => { if (e.data === YT.PlayerState.ENDED) finish(); } },
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch('/api/reflections', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reflection: text, videoId: video.id, title: video.title, channel: video.channel }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(json.message ?? 'No se pudo guardar.'); return; }
    setMomentId(json.id);
    setPhase('saved');
    onReflected?.(text.trim(), video);
  }

  if (phase === 'reflect' || phase === 'saved') {
    return (
      <div className="animate-enter rounded-[20px] bg-soi-sidebar p-3">
        <div className="rounded-lg bg-white p-4 shadow-ring">
          <p className="text-xs text-soi-muted">{video.title} · {video.channel}</p>
          {phase === 'reflect' ? (
            <form onSubmit={save} className="mt-2">
              <Label htmlFor={`refl-${video.id}`} className="text-[17px] font-medium leading-snug">{REFLECTION_QUESTION}</Label>
              <Textarea id={`refl-${video.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={1000} className="mt-2" autoFocus />
              <div className="mt-3 flex items-center gap-2">
                <Button type="submit" size="sm" disabled={busy || text.trim().length < 3}>{busy ? 'Guardando…' : 'Guardar idea'}</Button>
                {!startWithReflection && <button type="button" onClick={() => setPhase('facade')} className="press h-9 rounded-lg px-3 text-sm text-soi-muted hover:text-soi-ink">Ahora no</button>}
              </div>
              {msg && <p role="alert" className="mt-2 text-sm text-soi-danger">{msg}</p>}
            </form>
          ) : (
            <p className="mt-2 flex items-center gap-2 text-[15px]">
              <Check className="h-4 w-4 text-soi-accent" aria-hidden="true" /> Esa idea quedó guardada.
              {momentId && <Link href={`/momentos/${momentId}`} className="ml-auto text-sm text-soi-accent underline underline-offset-4">Ver</Link>}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-[14px] bg-black shadow-ring">
      <div className="relative aspect-video">
        {phase === 'playing' ? (
          <div ref={hostRef} className="absolute inset-0 h-full w-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
        ) : (
          <button type="button" onClick={play} className="press group absolute inset-0" aria-label={`Reproducir dentro de SOI: ${video.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={video.thumbnail} alt="" loading="lazy" data-bare className="h-full w-full object-cover opacity-90" />
            <span className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-soft transition-[background-color] duration-(--dur-fast) ease-out-strong group-hover:bg-white">
              <Play className="h-6 w-6 text-soi-ink" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <figcaption className="flex items-center gap-2 bg-white px-3 py-2 text-xs">
        <span className="min-w-0 flex-1 truncate"><span className="font-medium">{video.title}</span> · {video.channel}</span>
        {phase === 'playing' && (
          <button type="button" onClick={finish} className="press shrink-0 rounded-md px-2 py-1 text-soi-accent hover:bg-soi-accent-soft">Terminé</button>
        )}
      </figcaption>
    </figure>
  );
}
