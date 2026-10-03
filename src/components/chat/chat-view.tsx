'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import type { Message } from 'ai';
import { ArrowUp, Lock, Square } from 'lucide-react';
import { AGENTS, isAgentId, type AgentId } from '@/config/agents';
import { PAYWALL_MESSAGE } from '@/config/plans';
import { buttonClass } from '@/components/ui/button';
import { MessageBubble } from './message-bubble';
import { track } from '@/components/providers/analytics';
import { detectCrisis } from '@/lib/ai/crisis';
import type { Opener } from '@/lib/opener';

type Props = {
  conversationId?: string;
  initialMessages?: Message[];
  agent?: AgentId;
  opener?: Opener;
  paywalled: boolean;
  ttsAllowed: boolean;
  voice?: string | null;
};

const OPENER_ID = 'soi-opener';

/**
 * Chat sin fricción (DESIGN.md §4 · Chat):
 * - Sin bloques al inicio: SOI abre la conversación con un saludo personal y el cursor ya está en el campo.
 * - El agente que responde se elige solo (router) y se muestra discretamente; el del sidebar se respeta.
 * - El mensaje del usuario aparece al instante; el streaming no anima tokens; "pensando" es un pulso de opacidad.
 */
export function ChatView({ conversationId: initialId, initialMessages = [], agent, opener, paywalled: initialPaywalled, ttsAllowed, voice }: Props) {
  const convRef = useRef<string | undefined>(initialId);
  const [paywalled, setPaywalled] = useState(initialPaywalled);
  const [activeAgent, setActiveAgent] = useState<AgentId | undefined>(agent);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Auto-scroll solo si la persona ya estaba al final.
  const stickRef = useRef(true);

  const seed = useMemo<Message[]>(
    () => (initialMessages.length || !opener ? initialMessages : [{ id: OPENER_ID, role: 'assistant', content: opener.text }]),
    [initialMessages, opener],
  );

  const { messages, input, handleInputChange, handleSubmit, status, error, stop } = useChat({
    api: '/api/chat',
    initialMessages: seed,
    onResponse: (res) => {
      const id = res.headers.get('x-soi-conversation');
      if (id && !convRef.current) {
        convRef.current = id;
        window.history.replaceState(null, '', `/chat/${id}`);
      }
      const a = res.headers.get('x-soi-agent');
      if (isAgentId(a)) setActiveAgent(a);
    },
    onError: (e) => {
      if (e.message.includes(PAYWALL_MESSAGE) || e.message.includes('queries_exhausted')) setPaywalled(true);
    },
  });

  // Foco directo en el campo (solo con puntero fino: en móvil no abrimos el teclado sin pedirlo).
  useEffect(() => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [messages, status]);

  // Campo que crece con el texto (hasta 10 líneas).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [input]);

  function onScroll() {
    const el = scrollRef.current;
    if (el) stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64;
  }

  const busy = status === 'submitted' || status === 'streaming';
  // La crisis siempre pasa, incluso con paywall.
  const canSend = !paywalled || detectCrisis(input);
  const canSubmit = Boolean(input.trim()) && canSend && !busy;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit) return;
    stickRef.current = true;
    track('chat_message_sent', { agent: agent ?? 'auto' });
    handleSubmit(e, { body: { conversationId: convRef.current, agent } });
  }

  async function speakText(t: string) {
    const { speak } = await import('@/lib/voice/tts');
    await speak(t, { voice: voice ?? undefined });
  }

  const a = activeAgent && activeAgent !== 'crisis' ? AGENTS[activeAgent] : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-2xl flex-col md:h-dvh">
      {/* Quién te acompaña ahora: una línea discreta, no un bloque. */}
      <p className="nums flex h-10 shrink-0 items-center justify-center gap-1.5 text-xs text-soi-subtle" aria-live="polite">
        <span className="font-medium text-soi-muted">SOI</span>
        {a && <><span aria-hidden="true">·</span><span>{a.label}</span></>}
      </p>

      <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
        <ul className="flex flex-col gap-4 pt-[min(12vh,6rem)]" aria-live="polite" aria-label="Conversación">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              ttsAllowed={ttsAllowed}
              onSpeak={speakText}
              practice={m.id === OPENER_ID ? opener?.practice : null}
            />
          ))}
          {status === 'submitted' && (
            <li className="flex items-center gap-2 py-1 text-sm text-soi-muted" aria-label="SOI está escribiendo">
              <span aria-hidden="true" className="h-2 w-2 animate-thinking rounded-full bg-soi-accent" />
            </li>
          )}
        </ul>
        {error && !paywalled && <p role="alert" className="mt-3 text-sm text-soi-danger">Algo falló. Intenta de nuevo en un momento.</p>}
      </div>

      <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4">
        {paywalled && (
          <div className="mb-2 flex animate-banner-in flex-wrap items-center justify-between gap-3 rounded-[14px] bg-soi-sidebar px-3 py-2.5 shadow-ring" role="status">
            <p id="paywall-note" className="flex items-center gap-2 text-sm"><Lock className="h-4 w-4 text-soi-muted" aria-hidden="true" />{PAYWALL_MESSAGE}</p>
            <Link href="/planes" className={buttonClass('gold', 'sm')}>Pasar a SOI+</Link>
          </div>
        )}

        <form
          onSubmit={submit}
          onClick={() => inputRef.current?.focus()}
          className="flex items-end gap-2 rounded-[20px] bg-white p-2 pl-4 shadow-soft transition-shadow duration-(--dur-fast) ease-out-strong focus-within:shadow-[0_0_0_1px_var(--color-soi-accent-fill),0_0_0_4px_rgb(42_120_214/0.12)]"
        >
          <label htmlFor="chat-input" className="sr-only">Escribe tu mensaje</label>
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            placeholder={paywalled ? 'Pasa a SOI+ para seguir conversando' : 'Escríbele a SOI…'}
            rows={1}
            maxLength={4000}
            enterKeyHint="send"
            aria-disabled={!canSend}
            aria-describedby={paywalled ? 'paywall-note' : undefined}
            className="max-h-60 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-6 outline-none placeholder:text-soi-subtle aria-disabled:opacity-60"
          />
          {busy ? (
            <button type="button" onClick={stop} aria-label="Detener" className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soi-tray text-soi-ink">
              <Square className="h-4 w-4 fill-current" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSubmit}
              aria-label="Enviar"
              className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soi-ink text-white disabled:opacity-25"
            >
              <ArrowUp className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </form>
        <p className="mt-2 hidden text-center text-[11px] text-soi-subtle sm:block">SOI acompaña, no sustituye a un profesional de salud.</p>
      </div>
    </div>
  );
}
