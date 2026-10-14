'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Phone, Play } from 'lucide-react';
import { Cta } from '@/components/landing/cta';
import { Thinking } from '@/components/chat/thinking';
import { authorFromUrl } from '@/components/landing/author-picker';
import { track } from '@/components/providers/analytics';
import { trackFunnel, visitorId } from '@/lib/analytics/funnel-client';
import {
  LANDING_MAX_CHARS, LANDING_MAX_USER_MESSAGES, draftLoginHref, landingPhase, landingStarters,
  type LandingAuthor, type LandingMessage,
} from '@/lib/landing-chat';

type DraftView = { token: string; title: string; objective: string; source: string; minutes: number; steps: { type: string; title: string; minutes: number }[] };
type Saved = { messages: LandingMessage[]; moment: DraftView | null; resources?: { name: string; phone: string }[] | null };

const STORE = 'soi:landing-chat';
const load = (): Saved | null => { try { return JSON.parse(localStorage.getItem(STORE) ?? 'null') as Saved | null; } catch { return null; } };
const save = (s: Saved) => { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch { /* sin almacenamiento: sigue funcionando */ } };

/**
 * Chat de la landing, sin cuenta: la persona cuenta qué le pasa, SOI pregunta lo justo y le diseña su primer Moment.
 * "Comenzar" lleva a entrar; el Moment ya quedó guardado y, al entrar, se vuelve suyo y empieza (`/m/borrador/<token>`).
 */
export function LandingChat() {
  const [de, setDe] = useState<LandingAuthor | null>(null);
  const [messages, setMessages] = useState<LandingMessage[]>([]);
  const [moment, setMoment] = useState<DraftView | null>(null);
  const [resources, setResources] = useState<Saved['resources']>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ text: string; retry: boolean } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDe(authorFromUrl());
    // Solo vuelve el Moment ya diseñado (para no perderlo). Una conversación a medias no se restaura:
    // al volver, el chat empieza vacío, listo para escribir (si no, parece una imagen).
    const s = load();
    if (s?.moment && s.messages?.length) { setMessages(s.messages); setMoment(s.moment); }
    else {
      try { localStorage.removeItem(STORE); } catch { /* nada */ }
      // Como en los chats de IA, se escribe al llegar; en el teléfono no se abre el teclado solo.
      if (window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true });
    }
  }, []);
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, moment]);

  const mine = messages.filter((m) => m.role === 'user').length;
  const done = Boolean(moment || resources);
  const canWrite = !busy && !done && mine < LANDING_MAX_USER_MESSAGES;

  async function send(history: LandingMessage[]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/landing-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, de, vid: visitorId(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      const data = await res.json().catch(() => ({})) as { reply?: string; moment?: DraftView; crisis?: boolean; resources?: Saved['resources']; error?: string; retry?: boolean };
      if (!res.ok || !data.reply) {
        setError({ text: data.error ?? 'No pude responder ahora. Inténtalo otra vez.', retry: data.retry ?? res.status >= 500 });
        return;
      }
      const next = [...history, { role: 'assistant' as const, text: data.reply }];
      setMessages(next);
      setMoment(data.moment ?? null);
      setResources(data.crisis ? data.resources ?? [] : null);
      save({ messages: next, moment: data.moment ?? null, resources: data.crisis ? data.resources ?? [] : null });
      if (data.moment) track('landing_chat_moment', { minutes: data.moment.minutes, steps: data.moment.steps.length, de: de ?? 'general' });
    } catch {
      setError({ text: 'Sin conexión. Revisa tu internet e inténtalo otra vez.', retry: true });
    } finally {
      setBusy(false);
    }
  }

  function submit(text: string) {
    const t = text.trim().slice(0, LANDING_MAX_CHARS);
    if (!t || !canWrite) return;
    const history = [...messages, { role: 'user' as const, text: t }];
    setMessages(history);
    setInput('');
    trackFunnel('chat_message', String(history.filter((m) => m.role === 'user').length));
    if (window.matchMedia('(pointer: coarse)').matches) (document.activeElement as HTMLElement | null)?.blur(); // cierra el teclado
    void send(history);
  }

  function restart() {
    setMessages([]); setMoment(null); setResources(null); setError(null);
    try { localStorage.removeItem(STORE); } catch { /* nada */ }
    track('landing_chat_restart');
  }

  const designing = busy && landingPhase(messages) === 'design';

  const started = messages.length > 0 || busy;

  // Estilo DeepSeek / ChatGPT: vacío es solo el cuadro grande para escribir y las sugerencias debajo;
  // al escribir, la conversación crece arriba del mismo cuadro.
  return (
    <div>
      <div className="overflow-hidden rounded-[28px] bg-white text-soi-ink shadow-raised">
        {started && (
          <ul ref={listRef} aria-live="polite" aria-label="Conversación con SOI" className="flex max-h-[min(60vh,30rem)] flex-col gap-3 overflow-y-auto p-4 sm:p-5">
            {messages.map((m, i) => (
              <li key={i} className={m.role === 'user'
                ? 'ml-auto max-w-[88%] whitespace-pre-wrap rounded-[18px] rounded-tr-md bg-soi-ink px-4 py-2.5 text-[15px] leading-relaxed text-white'
                : 'max-w-[88%] whitespace-pre-wrap rounded-[18px] rounded-tl-md bg-soi-tray px-4 py-2.5 text-[15px] leading-relaxed'}>
                <span className="sr-only">{m.role === 'user' ? 'Tú: ' : 'SOI: '}</span>{m.text}
              </li>
            ))}
            {busy && <Thinking text={messages[messages.length - 1]?.text ?? ''} tool={designing ? 'Diseñando tu Moment…' : null} />}
            {resources && (
              <li className="rounded-[18px] bg-soi-gold/10 p-4">
                <ul className="flex flex-col gap-2">
                  {resources.map((r) => (
                    <li key={r.phone}>
                      <a href={`tel:${r.phone.replace(/[^\d*+]/g, '')}`} className="press inline-flex items-center gap-2 font-semibold underline-offset-2 hover:underline">
                        <Phone className="h-4 w-4" aria-hidden="true" />{r.name}: {r.phone}
                      </a>
                    </li>
                  ))}
                </ul>
              </li>
            )}
            {moment && (
              <li className="animate-enter-fade rounded-[20px] p-4 shadow-ring">
                <p className="nums text-xs font-medium text-soi-accent">Tu Moment · {moment.minutes} min</p>
                <p className="mt-1 text-lg font-semibold leading-snug">{moment.title}</p>
                <p className="mt-1 text-sm text-soi-muted">{moment.objective}</p>
                <ol className="mt-3 flex flex-col gap-1.5">
                  {moment.steps.map((s, i) => (
                    <li key={i} className="flex items-baseline gap-2.5 text-[15px]">
                      <span className="nums w-4 shrink-0 text-sm text-soi-muted">{i + 1}</span>
                      <span className="min-w-0 flex-1">{s.title}</span>
                      <span className="nums shrink-0 text-sm text-soi-muted">{s.minutes} min</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-soi-muted">{moment.source}</p>
                <Cta href={draftLoginHref(moment.token)} where={`chat:${de ?? 'general'}`}
                  className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-soi-ink text-base font-semibold text-white hover:bg-soi-ink/90">
                  <Play className="h-4 w-4" aria-hidden="true" />Comenzar
                </Cta>
                <p className="mt-2 text-center text-xs text-soi-muted">Entra con Google o tu correo y empieza al instante. Tu Moment ya está guardado.</p>
              </li>
            )}
          </ul>
        )}

        {error && (
          <p role="alert" className="mx-4 my-2 text-sm text-soi-danger sm:mx-5">
            {error.text}{' '}
            {error.retry && <button type="button" onClick={() => void send(messages)} className="font-semibold underline">Intentar de nuevo</button>}
          </p>
        )}

        {done ? (
          <div className="border-t border-black/5 px-4 py-3 text-center sm:px-5">
            <button type="button" onClick={restart} className="press min-h-11 text-sm text-soi-muted underline-offset-2 hover:underline">Empezar otra conversación</button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); submit(input); }} className={started ? 'border-t border-black/5 p-3 sm:p-4' : 'p-3 sm:p-4'}>
            <label htmlFor="landing-chat-input" className="sr-only">Cuéntale a SOI qué te pasa</label>
            <textarea id="landing-chat-input" ref={inputRef} rows={started ? 1 : 3} value={input} maxLength={LANDING_MAX_CHARS} disabled={!canWrite}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); submit(input); } }}
              placeholder={mine ? 'Cuéntale a SOI cómo te sientes o qué quieres lograr…' : 'Cuéntame qué te pasa hoy o qué quieres lograr…'}
              className="block max-h-40 w-full resize-none bg-transparent px-2 py-1.5 text-base leading-relaxed outline-none [field-sizing:content] placeholder:text-soi-muted disabled:opacity-60" />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="pl-2 text-xs text-soi-muted">{started ? '' : 'Sin cuenta para escribir · Guiado por voz'}</span>
              <button type="submit" disabled={!canWrite || !input.trim()} aria-label="Enviar"
                className="press grid h-11 w-11 shrink-0 place-items-center rounded-full bg-soi-ink text-white disabled:opacity-30">
                <ArrowUp className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </form>
        )}
      </div>

      {!messages.length && !busy && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {landingStarters(de).map((s) => (
            <button key={s} type="button" onClick={() => submit(s)}
              className="press min-h-11 rounded-full bg-white/[0.07] px-4 py-2 text-left text-sm text-white/85 ring-1 ring-white/15 hover:bg-white/[0.12] hover:text-white">{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}
