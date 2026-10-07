'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useRouter } from 'next/navigation';
import { ArrowUp, Lock, Square } from 'lucide-react';
import { AGENTS, isAgentId, type AgentId } from '@/config/agents';
import { PAYWALL_MESSAGE } from '@/config/plans';
import { buttonClass } from '@/components/ui/button';
import { MessageBubble } from './message-bubble';
import { Thinking } from './thinking';
import { TOOL_STATUS } from '@/lib/thinking-phrases';
import { track } from '@/components/providers/analytics';
import { detectCrisis } from '@/lib/ai/crisis';
import type { Opener } from '@/lib/opener';
import { unlockAudio } from '@/lib/voice/player';
import { DictationButton } from './dictation';

type Props = {
  conversationId?: string;
  initialMessages?: UIMessage[];
  agent?: AgentId;
  opener?: Opener;
  paywalled: boolean;
  ttsAllowed: boolean;
  voice?: string | null;
};

const OPENER_ID = 'soi-opener';

/** La conversación en curso vive en sessionStorage: se borra al cerrar la app (la próxima vez, chat nuevo). */
const ACTIVE_KEY = 'soi:active-chat';
function activeChat() { try { return sessionStorage.getItem(ACTIVE_KEY); } catch { return null; } }
function rememberActiveChat(id: string) { try { sessionStorage.setItem(ACTIVE_KEY, id); } catch { /* sin almacenamiento */ } }
function forgetActiveChat() { try { sessionStorage.removeItem(ACTIVE_KEY); } catch { /* sin almacenamiento */ } }

/**
 * Chat sin fricción (DESIGN.md §4 · Chat):
 * - Sin bloques al inicio: SOI abre la conversación con un saludo personal y el cursor ya está en el campo.
 * - El agente que responde se elige solo (router) y se muestra discretamente; el del sidebar se respeta.
 * - El mensaje del usuario aparece al instante; el streaming no anima tokens; "pensando" es un pulso de opacidad.
 */
export function ChatView({ conversationId: initialId, initialMessages = [], agent, opener, paywalled: initialPaywalled, ttsAllowed }: Props) {
  const router = useRouter();
  const convRef = useRef<string | undefined>(initialId);
  const [paywalled, setPaywalled] = useState(initialPaywalled);
  const [activeAgent, setActiveAgent] = useState<AgentId | undefined>(agent);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Auto-scroll solo si la persona ya estaba al final.
  const stickRef = useRef(true);

  const seed = useMemo<UIMessage[]>(
    () => (initialMessages.length || !opener ? initialMessages : [{ id: OPENER_ID, role: 'assistant', parts: [{ type: 'text', text: opener.text }] }]),
    [initialMessages, opener],
  );

  const [input, setInput] = useState('');
  // Medición (PostHog): qué saludo se mostró, cómo llega el primer mensaje (chip, escrito, dictado) y cuánto tardó.
  const openedAt = useRef(Date.now());
  const firstSent = useRef(false);
  const dictated = useRef(false);
  function firstMessage(via: 'chip' | 'link' | 'typed' | 'voice') {
    if (firstSent.current || initialMessages.length) return;
    firstSent.current = true;
    track('chat_first_message', { via, opener: opener?.kind ?? null, ms: Date.now() - openedAt.current });
  }
  useEffect(() => {
    // Lo que no hace falta para el saludo se precarga cuando el navegador está libre (la primera respuesta llega sin espera).
    const preload = () => { void import('./markdown'); void import('./moment-proposal'); };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (ric) ric(preload); else setTimeout(preload, 1500);
    if (opener && !initialMessages.length) track('chat_opened', { opener: opener.kind });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El transporte se crea una vez. Un fetch envuelto lee los headers de SOI (conversación y agente).
  // `conversationId` y `agent` viajan en el body de cada petición.
  const [transport] = useState(() => new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest: ({ messages: msgs, body }) => ({
      body: { ...body, messages: msgs, conversationId: convRef.current, agent },
    }),
    fetch: async (url, init) => {
      const res = await fetch(url, init);
      const id = res.headers.get('x-soi-conversation');
      if (id && !convRef.current) {
        convRef.current = id;
        window.history.replaceState(null, '', `/chat/${id}`);
        rememberActiveChat(id);
      }
      const a = res.headers.get('x-soi-agent');
      if (isAgentId(a)) setActiveAgent(a);
      return res;
    },
  }));

  const { messages, sendMessage, status, error, stop } = useChat({
    messages: seed,
    transport,
    onError: (e) => {
      if (e.message.includes(PAYWALL_MESSAGE) || e.message.includes('queries_exhausted')) setPaywalled(true);
    },
  });

  /** El servidor responde JSON con `error` en fallos conocidos (503, 402): mostramos ese texto. */
  const errorText = useMemo(() => {
    if (!error) return null;
    try {
      const j = JSON.parse(error.message) as { error?: string; message?: string };
      return j.error ?? j.message ?? null;
    } catch {
      return null;
    }
  }, [error]);

  // Mientras la app está abierta, volver a SOI desde otra sección regresa a la conversación en curso.
  // Una sesión nueva de la app (o "Nueva conversación") empieza un chat nuevo.
  useEffect(() => {
    if (initialId) { rememberActiveChat(initialId); return; }
    const params = new URLSearchParams(window.location.search);
    if (params.has('nueva')) { forgetActiveChat(); window.history.replaceState(null, '', '/chat'); return; }
    if (agent) return;
    const active = activeChat();
    if (active) router.replace(`/chat/${active}`);
  }, [initialId, agent, router]);

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

  // "Ahora no" a la propuesta del saludo: su botón de empezar desaparece de las respuestas rápidas.
  const [declined, setDeclined] = useState(false);
  const busy = status === 'submitted' || status === 'streaming';
  // Espera visible: hasta que SOI escribe texto (o mientras usa una herramienta).
  const lastMsg = messages.at(-1);
  const lastUserText = [...messages].reverse().find((m) => m.role === 'user')?.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' ') ?? '';
  const assistantText = lastMsg?.role === 'assistant' ? lastMsg.parts.some((p) => p.type === 'text' && p.text.trim().length > 0) : false;
  const pendingToolPart = lastMsg?.role === 'assistant'
    ? lastMsg.parts.find((p) => p.type.startsWith('tool-') && (p as { state?: string }).state !== 'output-available' && (p as { state?: string }).state !== 'output-error')
    : undefined;
  const pendingTool = pendingToolPart ? TOOL_STATUS[pendingToolPart.type.slice('tool-'.length)] ?? null : null;
  const waiting = status === 'submitted' || (status === 'streaming' && (!assistantText || Boolean(pendingToolPart)));
  // La crisis siempre pasa, incluso con paywall.
  const canSend = !paywalled || detectCrisis(input);
  const canSubmit = Boolean(input.trim()) && canSend && !busy;

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit) return;
    stickRef.current = true;
    track('chat_message_sent', { agent: agent ?? 'auto' });
    firstMessage(dictated.current ? 'voice' : 'typed');
    sendMessage({ text: input.trim() });
    setInput('');
    // En el teléfono se sale del modo escritura (se cierra el teclado) para ver la respuesta.
    if (window.matchMedia('(pointer: coarse)').matches) inputRef.current?.blur();
  }

  async function speakText(t: string) {
    unlockAudio(); // síncrono, dentro del toque en "Escuchar" (iOS)
    const { speak } = await import('@/lib/voice/tts');
    await speak(t, { style: 'chat' });
  }

  const a = activeAgent && activeAgent !== 'crisis' ? AGENTS[activeAgent] : null;

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem-env(safe-area-inset-bottom))] max-w-2xl flex-col md:h-dvh">
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
              proposal={m.id === OPENER_ID ? opener?.proposal : null}
              onDecline={() => setDeclined(true)}
              onSend={(text) => { stickRef.current = true; sendMessage({ text }); }}
              onReflected={(text, video) => {
                stickRef.current = true;
                sendMessage({ text: `Mi reflexión de «${video.title}»: ${text}` });
              }}
            />
          ))}
          {/* Respuestas rápidas del saludo: un toque y SOI ajusta (sin escribir). Solo antes del primer mensaje. */}
          {/* Respuestas del saludo: hasta 3 chips y, debajo, lo secundario como enlaces discretos. Solo antes del primer mensaje. */}
          {opener && messages.length === 1 && messages[0]?.id === OPENER_ID && (opener.replies.length > 0 || opener.links.length > 0) && (
            <li className="-mt-1 flex flex-col gap-2.5" aria-label="Respuestas rápidas">
              {opener.replies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {opener.replies.map((r) => r.href ? (
                    <Link key={r.label} href={r.href} className="press inline-flex h-9 items-center rounded-full bg-soi-ink px-3.5 text-sm text-white">{r.label}</Link>
                  ) : (
                    <button key={r.label} type="button" disabled={!canSend && !detectCrisis(r.text ?? '')}
                      onClick={() => { stickRef.current = true; track('opener_reply', { label: r.label }); firstMessage('chip'); sendMessage({ text: r.text ?? r.label }); }}
                      className="press inline-flex h-9 items-center rounded-full bg-white px-3.5 text-sm text-soi-ink shadow-ring hover:shadow-soft disabled:opacity-40">
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
              {opener.links.filter(() => !declined).length > 0 && (
                <div className="flex flex-wrap items-center gap-x-1 text-sm text-soi-muted">
                  {opener.links.map((r, n) => (
                    <span key={r.label} className="inline-flex items-center gap-1">
                      {n > 0 && <span aria-hidden="true">·</span>}
                      {r.href ? (
                        <Link href={r.href} className="press rounded px-1 py-1 underline-offset-4 hover:text-soi-ink hover:underline">{r.label}</Link>
                      ) : (
                        <button type="button" disabled={!canSend}
                          onClick={() => { stickRef.current = true; track('opener_reply', { label: r.label }); firstMessage('link'); sendMessage({ text: r.text ?? r.label }); }}
                          className="press rounded px-1 py-1 underline-offset-4 hover:text-soi-ink hover:underline disabled:opacity-40">{r.label}</button>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </li>
          )}
          {waiting && <Thinking text={lastUserText} agent={activeAgent ?? agent} tool={pendingTool} />}
        </ul>
        {error && !paywalled && <p role="alert" className="mt-3 text-sm text-soi-danger">{errorText ?? 'Algo falló. Intenta de nuevo en un momento.'}</p>}
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
          className="flex items-end gap-2 rounded-[20px] bg-white p-2 pl-4 shadow-soft"
        >
          <label htmlFor="chat-input" className="sr-only">Escribe tu mensaje</label>
          <textarea
            ref={inputRef}
            id="chat-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(); } }}
            placeholder={paywalled ? 'Pasa a SOI+ para seguir conversando' : 'Cuéntame lo que traes…'}
            rows={1}
            maxLength={4000}
            enterKeyHint="send"
            aria-disabled={!canSend}
            aria-describedby={paywalled ? 'paywall-note' : undefined}
            className="max-h-60 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-6 outline-none placeholder:text-soi-subtle aria-disabled:opacity-60"
          />
          {!busy && <DictationButton value={input} onChange={setInput} disabled={!canSend && !input} onUsed={() => { dictated.current = true; }} />}
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
