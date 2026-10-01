'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { Volume2, Star, Lock } from 'lucide-react';
import type { Message } from 'ai';
import { YouTubeEmbed } from './youtube-embed';
import { cn } from '@/lib/utils';

type Props = { message: Message; ttsAllowed: boolean; onSpeak: (t: string) => void };

export function MessageBubble({ message, ttsAllowed, onSpeak }: Props) {
  const mine = message.role === 'user';
  return (
    <li className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[88%] rounded-3xl px-4 py-3 sm:max-w-[75%]', mine ? 'bg-soi-ink text-white' : 'border border-black/10 bg-white')}>
        {mine ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-a:text-soi-ink prose-a:underline">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}

        {message.toolInvocations?.map((t) => {
          if (t.state !== 'result') return null;
          if (t.toolName === 'youtubeSearch') {
            const r = t.result as { locked: boolean; videos: { id: string; title: string; channel: string; thumbnail: string }[] };
            if (r.locked) return (
              <p key={t.toolCallId} className="mt-2 flex items-center gap-2 text-sm text-black/60">
                <Lock className="h-4 w-4" aria-hidden="true" /> Videos disponibles en <Link href="/planes" className="underline">SOI+</Link>
              </p>
            );
            return <div key={t.toolCallId} className="mt-3 grid gap-3">{r.videos.map((v) => <YouTubeEmbed key={v.id} video={v} />)}</div>;
          }
          if (t.toolName === 'saveEvidence') {
            const r = t.result as { locked: boolean };
            return (
              <p key={t.toolCallId} className="mt-2 flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-soi-gold" aria-hidden="true" />
                {r.locked ? <>Guardar evidencias es parte de <Link href="/planes" className="underline">SOI+</Link></> : <>Guardado en tu <Link href="/evidencias" className="underline">Muro de Evidencias</Link></>}
              </p>
            );
          }
          return null;
        })}

        {!mine && ttsAllowed && message.content && (
          <button onClick={() => onSpeak(message.content)} className="mt-2 inline-flex items-center gap-1 text-xs text-black/60 hover:text-black" aria-label="Escuchar respuesta">
            <Volume2 className="h-4 w-4" aria-hidden="true" /> Escuchar
          </button>
        )}
      </div>
    </li>
  );
}
