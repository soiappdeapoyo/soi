'use client';

import { useState } from 'react';
import { Play } from 'lucide-react';

type Video = { id: string; title: string; channel: string; thumbnail: string };

/** Facade ligero: carga el iframe solo al hacer clic (Lighthouse ≥95). */
export function YouTubeEmbed({ video }: { video: Video }) {
  const [play, setPlay] = useState(false);
  return (
    <figure className="overflow-hidden rounded-[14px] bg-black shadow-ring">
      <div className="relative aspect-video">
        {play ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="press group absolute inset-0" aria-label={`Reproducir: ${video.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={video.thumbnail} alt="" loading="lazy" className="h-full w-full object-cover opacity-90" />
            <span className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/90 shadow-soft transition-[background-color] duration-(--dur-fast) ease-out-strong group-hover:bg-white">
              <Play className="h-6 w-6 text-soi-ink" aria-hidden="true" />
            </span>
          </button>
        )}
      </div>
      <figcaption className="bg-white px-3 py-2 text-xs"><span className="font-medium">{video.title}</span> · {video.channel}</figcaption>
    </figure>
  );
}
