'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import type { Message } from 'ai';
import { SendHorizonal, Lock, Square } from 'lucide-react';
import { AGENTS, type AgentId } from '@/config/agents';
import { PAYWALL_MESSAGE } from '@/config/plans';
import { Button, buttonClass } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { MessageBubble } from './message-bubble';
import { PrincipioNav } from '@/components/principio/principio-nav';
import { track } from '@/components/providers/analytics';
import { detectCrisis } from '@/lib/ai/crisis';

type Props = {
  conversationId?: string;
  initialMessages?: Message[];
  agent?: AgentId;
  paywalled: boolean;
  ttsAllowed: boolean;
  voice?: string | null;
  greeting?: string | null;
};

const STARTERS: Record<string, string[]> = {
  default: ['Hoy me siento sin energía', 'Quiero empezar una rutina de mañana', 'Ayúdame con una afirmación para hoy'],
  manifestacion: ['¿Cómo hago SATS esta noche?', 'Quiero practicar la Revisión'],
  afirmacion: ['Dame 3 afirmaciones para confiar en mí', 'Afirmaciones para un día difícil'],
  meditacion: ['Guíame 3 minutos de respiración', 'Necesito calmar mi mente'],
  suenos: ['Soñé que volaba sobre el mar', 'Quiero empezar un diario de sueños'],
  riqueza: ['Ayúdame con mis 10 metas', 'Tengo creencias de escasez'],
  brian_tracy: ['¿Cuál es mi rana de hoy?', 'Quiero escribir mis 10 metas'],
};

export function ChatView({ conversationId: initialId, initialMessages = [], agent, paywalled: initialPaywalled, ttsAllowed, voice, greeting }: Props) {
  const convRef = useRef<string | undefined>(initialId);
  const [paywalled, setPaywalled] = useState(initialPaywalled);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Auto-scroll solo si la persona ya estaba al final (DESIGN.md §4 · Chat).
  const stickRef = useRef(true);

  const { messages, input, setInput, handleInputChange, handleSubmit, status, error, stop } = useChat({
    api: '/api/chat',
    initialMessages,
    onResponse: (res) => {
      const id = res.headers.get('x-soi-conversation');
      if (id && !convRef.current) {
        convRef.current = id;
        window.history.replaceState(null, '', `/chat/${id}`);
      }
    },
    onError: (e) => {
      if (e.message.includes(PAYWALL_MESSAGE) || e.message.includes('queries_exhausted')) setPaywalled(true);
    },
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, status]);

  function onScroll() {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
  }

  const busy = status === 'submitted' || status === 'streaming';
  // La crisis siempre pasa, incluso con paywall.
  const canSend = !paywalled || detectCrisis(input);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!input.trim() || busy || !canSend) return;
    stickRef.current = true;
    track('chat_message_sent', { agent: agent ?? 'auto' });
    handleSubmit(e, { body: { conversationId: convRef.current, agent } });
  }

  async function speakText(t: string) {
    const { speak } = await import('@/lib/voice/tts');
    await speak(t, { voice: voice ?? undefined });
  }

  const a = agent ? AGENTS[agent] : null;
  const starters = STARTERS[agent ?? 'default'] ?? STARTERS.default!;

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-3xl flex-col md:h-dvh">
      <header className="flex items-center gap-3 px-4 py-3 shadow-[0_1px_0_rgb(0_0_0/0.06)]">
        {a ? (
          <>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-soi-tray text-soi-ink"><Icon name={a.icon} /></span>
            <div><h1 className="font-semibold">{a.label}</h1><p className="text-xs text-soi-muted">{a.sources.join(' · ') || 'SOI'}</p></div>
          </>
        ) : (
          <div><h1 className="font-semibold">SOI</h1><p className="text-xs text-soi-muted">Pensamientos → Emociones → Acciones → Resultados</p></div>
        )}
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="mx-auto mt-6 flex max-w-xl flex-col gap-6">
            {!agent && <PrincipioNav />}
            <div className="text-center">
              {greeting && <p className="mb-4 rounded-xl bg-soi-tray p-3 text-sm">{greeting}</p>}
              <p className="text-2xl font-semibold">¿Qué quieres transformar hoy?</p>
              <ul className="mt-5 flex flex-col gap-2">
                {starters.map((s, i) => (
                  <li key={s} className="animate-enter" style={{ animationDelay: `${i * 40}ms` }}>
                    <button type="button" onClick={() => setInput(s)} className="press w-full rounded-xl bg-white px-4 py-3 text-left shadow-ring hover:shadow-soft">{s}</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <ul ref={listRef} className="flex flex-col gap-3" aria-live="polite" aria-label="Conversación">
            {messages.map((m) => <MessageBubble key={m.id} message={m} ttsAllowed={ttsAllowed} onSpeak={speakText} />)}
            {status === 'submitted' && (
              <li className="flex items-center gap-2 px-1 text-sm text-soi-muted" aria-label="SOI está escribiendo">
                <span aria-hidden="true" className="h-2 w-2 animate-thinking rounded-full bg-soi-accent" />
                <span className="animate-thinking">SOI está pensando…</span>
              </li>
            )}
          </ul>
        )}
        {error && !paywalled && <p role="alert" className="mt-3 text-center text-sm text-soi-danger">Algo falló. Intenta de nuevo en un momento.</p>}
      </div>

      {paywalled && (
        <div className="mx-4 mb-2 flex animate-banner-in flex-wrap items-center justify-between gap-3 rounded-2xl bg-soi-gold/10 p-3 shadow-[0_0_0_1px_rgb(212_175_55/0.45)]" role="status">
          <p id="paywall-note" className="flex items-center gap-2 text-sm font-medium"><Lock className="h-4 w-4" aria-hidden="true" />{PAYWALL_MESSAGE}</p>
          <Link href="/planes" className={buttonClass('gold', 'sm')}>Pasar a SOI+</Link>
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2 p-3 shadow-[0_-1px_0_rgb(0_0_0/0.06)]">
        <label htmlFor="chat-input" className="sr-only">Escribe tu mensaje</label>
        <textarea
          id="chat-input"
          value={input}
          onChange={handleInputChange}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          placeholder={paywalled ? 'Pasa a SOI+ para seguir conversando' : 'Escribe lo que sientes o piensas…'}
          rows={1}
          maxLength={4000}
          aria-disabled={!canSend}
          aria-describedby={paywalled ? 'paywall-note' : undefined}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-xl bg-white px-4 py-2.5 shadow-[0_0_0_1px_rgb(0_0_0/0.18)] transition-[box-shadow] duration-(--dur-fast) ease-out-strong focus:shadow-[0_0_0_2px_var(--color-soi-accent)] focus:outline-none aria-disabled:opacity-60"
        />
        {busy ? (
          <Button size="icon" variant="outline" onClick={stop} aria-label="Detener"><Square className="h-5 w-5" aria-hidden="true" /></Button>
        ) : (
          <Button type="submit" size="icon" disabled={!input.trim() || !canSend} aria-label="Enviar"><SendHorizonal className="h-5 w-5" aria-hidden="true" /></Button>
        )}
      </form>
    </div>
  );
}
