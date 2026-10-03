'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { Volume2, Star, Lock, BellRing } from 'lucide-react';
import type { Message } from 'ai';
import { YouTubeEmbed } from './youtube-embed';
import { PracticeCard, type Practice } from './practice-card';
import { cn } from '@/lib/utils';

type Props = { message: Message; ttsAllowed: boolean; onSpeak: (t: string) => void; practice?: Practice | null };

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
}

/**
 * Chat (DESIGN.md §4): el mensaje del usuario aparece al instante (sin animación de entrada);
 * el streaming del asistente no anima tokens: solo crece el texto.
 */
export function MessageBubble({ message, ttsAllowed, onSpeak, practice }: Props) {
  const mine = message.role === 'user';
  return (
    <li className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[88%] sm:max-w-[75%]', mine ? 'rounded-[14px] bg-soi-tray px-4 py-2.5' : 'px-1 py-1')}>
        {mine ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose max-w-none text-[15px] leading-relaxed text-soi-ink prose-p:my-2 prose-a:text-soi-accent prose-a:underline prose-strong:font-medium prose-strong:text-soi-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}

        {message.toolInvocations?.map((t) => {
          if (t.state !== 'result') return null;
          if (t.toolName === 'youtubeSearch') {
            const r = t.result as { locked: boolean; videos: { id: string; title: string; channel: string; thumbnail: string }[] };
            if (r.locked) return (
              <p key={t.toolCallId} className="mt-2 flex items-center gap-2 text-sm text-soi-muted">
                <Lock className="h-4 w-4" aria-hidden="true" /> Videos disponibles en <Link href="/planes" className="underline">SOI+</Link>
              </p>
            );
            return <div key={t.toolCallId} className="mt-3 grid gap-3">{r.videos.map((v) => <YouTubeEmbed key={v.id} video={v} />)}</div>;
          }
          if (t.toolName === 'suggestPractice') {
            return <PracticeCard key={t.toolCallId} practice={t.result as Practice} />;
          }
          if (t.toolName === 'scheduleReminder') {
            const r = t.result as { ok: boolean; when: string };
            if (!r.ok) return null;
            return (
              <p key={t.toolCallId} className="mt-2 flex items-center gap-2 text-sm text-soi-muted">
                <BellRing className="h-4 w-4 text-soi-accent" aria-hidden="true" /> Recordatorio guardado{formatWhen(r.when) ? ` · ${formatWhen(r.when)}` : ''}
              </p>
            );
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

        {practice && <PracticeCard practice={practice} />}

        {!mine && ttsAllowed && message.content && (
          <button type="button" onClick={() => onSpeak(message.content)} className="press tap-target mt-2 inline-flex items-center gap-1 rounded-md text-xs text-soi-muted hover:text-soi-ink" aria-label="Escuchar respuesta">
            <Volume2 className="h-4 w-4" aria-hidden="true" /> Escuchar
          </button>
        )}
      </div>
    </li>
  );
}
