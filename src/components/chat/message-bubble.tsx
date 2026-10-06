'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Link from 'next/link';
import { Volume2, Star, Lock, BellRing, Layers } from 'lucide-react';
import type { UIMessage } from 'ai';
import { SoiPlayer, type SoiVideo } from '@/components/media/soi-player';
import { PracticeCard, type Practice } from './practice-card';
import { ActionCardView, type ActionCardResult } from './action-card-view';
import { MomentProposal, type MomentProposalResult } from './moment-proposal';
import { OpenerProposal } from './opener-proposal';
import { GuidedCard, type GuidedResult } from './guided-card';
import type { OpenerProposal as OpenerProposalData } from '@/lib/opener';
import { cn } from '@/lib/utils';

type Reflect = (text: string, video: SoiVideo) => void;
type Props = { message: UIMessage; ttsAllowed: boolean; onSpeak: (t: string) => void; practice?: Practice | null; proposal?: OpenerProposalData | null; onReflected?: Reflect; onSend?: (text: string) => void };

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es', { weekday: 'long', hour: 'numeric', minute: '2-digit' });
}

type ToolPart = { type: string; toolCallId: string; state: string; output?: unknown };

/** Texto plano de un mensaje (v7: el contenido vive en `parts`). */
export function messageText(message: UIMessage) {
  return message.parts.map((p) => (p.type === 'text' ? p.text : '')).join('');
}

function ToolResult({ part, onReflected, onSend }: { part: ToolPart; onReflected?: Reflect; onSend?: (text: string) => void }) {
  const name = part.type.slice('tool-'.length);
  const out = part.output;
  if (name === 'youtubeSearch') {
    const r = out as { locked: boolean; videos: SoiVideo[] };
    if (r.locked) return (
      <p className="mt-2 flex items-center gap-2 text-sm text-soi-muted">
        <Lock className="h-4 w-4" aria-hidden="true" /> Videos disponibles en <Link href="/planes" className="underline">SOI+</Link>
      </p>
    );
    // Un solo video, elegido por la IA: inspiración sin menú de opciones ni distracciones.
    const v = r.videos[0];
    return v ? <div className="mt-3"><SoiPlayer video={v} onReflected={onReflected} /></div> : null;
  }
  if (name === 'suggestPractice') return <PracticeCard practice={out as Practice} />;
  if (name === 'createMoment' || name === 'offerMoment') {
    const r = out as MomentProposalResult | { ok: false };
    return r.ok ? <MomentProposal m={r} onSend={onSend} /> : null;
  }
  if (name === 'createGuidedContent') {
    const r = out as GuidedResult | { ok: false; locked: boolean };
    if (!r.ok) return r.locked ? <p className="mt-2 flex items-center gap-2 text-sm text-soi-muted"><Lock className="h-4 w-4" aria-hidden="true" /> Meditaciones y manifestaciones escritas para ti son parte de <Link href="/planes" className="underline">SOI+</Link></p> : null;
    return <GuidedCard g={r} onSend={onSend} />;
  }
  // Conversaciones anteriores a los Moments ejecutables.
  if (name === 'createActionCard') return <ActionCardView card={out as ActionCardResult} />;
  if (name === 'captureIdea' || name === 'captureMoment') {
    const r = out as { ok: boolean; id?: string };
    if (!r.ok || !r.id) return null;
    return (
      <p className="mt-2 flex items-center gap-2 text-sm text-soi-muted">
        <Layers className="h-4 w-4 text-soi-accent" aria-hidden="true" /> Guardé esta idea en tu <Link href={`/ideas/${r.id}`} className="underline underline-offset-4">biblioteca</Link>
      </p>
    );
  }
  if (name === 'scheduleReminder') {
    const r = out as { ok: boolean; when: string };
    if (!r.ok) return null;
    return (
      <p className="mt-2 flex items-center gap-2 text-sm text-soi-muted">
        <BellRing className="h-4 w-4 text-soi-accent" aria-hidden="true" /> Recordatorio guardado{formatWhen(r.when) ? ` · ${formatWhen(r.when)}` : ''}
      </p>
    );
  }
  if (name === 'saveEvidence') {
    const r = out as { locked: boolean };
    return (
      <p className="mt-2 flex items-center gap-2 text-sm">
        <Star className="h-4 w-4 text-soi-gold" aria-hidden="true" />
        {r.locked ? <>Guardar evidencias es parte de <Link href="/planes" className="underline">SOI+</Link></> : <>Guardado en tu <Link href="/evidencias" className="underline">Muro de Evidencias</Link></>}
      </p>
    );
  }
  return null;
}

/**
 * Chat (DESIGN.md §4): el mensaje del usuario aparece al instante (sin animación de entrada);
 * el streaming del asistente no anima tokens: solo crece el texto.
 */
export function MessageBubble({ message, ttsAllowed, onSpeak, practice, proposal, onReflected, onSend }: Props) {
  const mine = message.role === 'user';
  const text = messageText(message);
  const tools = message.parts.filter((p) => p.type.startsWith('tool-') && (p as ToolPart).state === 'output-available') as ToolPart[];
  return (
    <li className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div className={cn(mine ? 'max-w-[85%] rounded-[14px] bg-soi-tray px-3.5 py-2' : 'w-full max-w-full py-1')}>
        {mine ? (
          <p className="whitespace-pre-wrap">{text}</p>
        ) : text ? (
          <div className="prose max-w-none text-[15px] leading-relaxed text-soi-ink prose-p:my-2 prose-a:text-soi-accent prose-a:underline prose-strong:font-medium prose-strong:text-soi-ink">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          </div>
        ) : null}

        {tools.map((t) => <ToolResult key={t.toolCallId} part={t} onReflected={onReflected} onSend={onSend} />)}

        {practice && <PracticeCard practice={practice} />}
        {proposal && <OpenerProposal p={proposal} />}

        {!mine && ttsAllowed && text && (
          <button type="button" onClick={() => onSpeak(text)} className="press tap-target mt-2 inline-flex items-center gap-1 rounded-md text-xs text-soi-muted hover:text-soi-ink" aria-label="Escuchar respuesta">
            <Volume2 className="h-4 w-4" aria-hidden="true" /> Escuchar
          </button>
        )}
      </div>
    </li>
  );
}
