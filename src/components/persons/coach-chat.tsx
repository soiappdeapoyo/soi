'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, GraduationCap, Lightbulb, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { CoachMessage, CoachState } from '@/lib/persons/coach-server';
import { COACH_HUE, COACH_NAME, COACH_PROMPTS, FEEDBACK_PROMPT } from '@/lib/persons/coach';
import { SKILLS, type DebriefReport } from '@/lib/persons/debrief';
import type { Gender } from '@/lib/persons/spec';
import { WA } from '@/config/persons';
import { buttonClass } from '@/components/ui/button';
import { PersonaAvatar } from './avatar';
import { TypingDots } from './typing-dots';
import { DebriefView } from './debrief-view';
import { clockTime, dayKey, dayLabel } from './time';

const HEADER = '#4A3AA8';
const MIN_TYPING_MS = 900;

type Local = CoachMessage & { local?: boolean };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * El chat con el coach de un personaje, como hablar con un amigo que sabe del tema: va dejando ideas sobre tu
 * práctica, le preguntas cómo mejorar o qué contestar, y al terminar la sesión te deja el feedback como tarjeta.
 */
export function CoachChat({ personaId, persona, initial, autoFeedback, gate: initialGate }: {
  personaId: string;
  persona: { name: string; gender: Gender; hue: number; avatar: string | null };
  initial: CoachState; autoFeedback: boolean; gate: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Local[]>(initial.messages);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const [gate, setGate] = useState(initialGate);
  const scroller = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const started = useRef(false);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, typing]);

  const say = (content: string): Local => ({ id: `local-${Date.now()}-${Math.random()}`, role: 'coach', kind: 'text', content, created_at: new Date().toISOString(), local: true });
  const mine = (content: string): Local => ({ id: `local-${Date.now()}`, role: 'user', kind: 'text', content, created_at: new Date().toISOString(), local: true });

  /** Pide algo al servidor con "escribiendo…" visible un mínimo (que no aparezca y desaparezca de golpe). */
  async function withTyping<T>(run: () => Promise<T>): Promise<T> {
    setTyping(true);
    atBottom.current = true;
    try {
      const [r] = await Promise.all([run(), wait(MIN_TYPING_MS)]);
      return r;
    } finally {
      setTyping(false);
    }
  }

  async function feedback() {
    const r = await withTyping(async () => {
      try {
        const res = await fetch(`/api/persons/${personaId}/debrief`, { method: 'POST' });
        return { ok: res.ok, data: (await res.json().catch(() => ({}))) as { coach?: CoachMessage[]; report?: DebriefReport; error?: string; reason?: string } };
      } catch {
        return { ok: false, data: { error: 'sin conexión' } };
      }
    });
    if (r.ok && r.data.coach?.length) setMessages((m) => [...m, ...r.data.coach!]);
    else if (r.data.reason === 'too_short') setMessages((m) => [...m, say(`todavía no hay mucho que revisar 😅 escríbele unos mensajes más a ${persona.name} y me dices`)]);
    else setMessages((m) => [...m, say('uy, no pude leer la plática ahorita. inténtalo otra vez en un momento')]);
  }

  async function observe() {
    const r = await withTyping(async () => {
      try {
        const res = await fetch(`/api/persons/${personaId}/coach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'observe' }) });
        return res.ok ? ((await res.json()) as { messages: CoachMessage[] }).messages : [];
      } catch { return []; }
    });
    if (r.length) setMessages((m) => [...m, ...r]);
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (autoFeedback) {
      router.replace(`/persons/${personaId}/coach`, { scroll: false });
      void feedback();
    } else if (initial.pendingTurns > 0) {
      void observe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(raw: string) {
    const content = raw.trim();
    if (!content || typing) return;
    setText('');
    const own = mine(content);
    setMessages((m) => [...m, own]);
    if (content === FEEDBACK_PROMPT) { await feedback(); return; }
    if (gate) { setMessages((m) => [...m, say('para seguir platicando conmigo necesitas Plus. tu práctica y todo lo que hablamos queda guardado')]); return; }
    const r = await withTyping(async () => {
      try {
        const res = await fetch(`/api/persons/${personaId}/coach`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: content }) });
        return { ok: res.ok, data: (await res.json().catch(() => ({}))) as { messages?: CoachMessage[]; error?: string; reason?: string } };
      } catch {
        return { ok: false, data: { error: 'Sin conexión. Tu mensaje no se envió.' } };
      }
    });
    if (r.ok && r.data.messages) {
      // El mensaje propio ya viene del servidor: reemplaza al local.
      setMessages((m) => [...m.filter((x) => x.id !== own.id), ...r.data.messages!]);
    } else if (r.data.reason === 'exhausted') {
      setGate(true);
      setMessages((m) => [...m, say('se acabaron tus mensajes del plan Free. con Plus seguimos cuando quieras')]);
    } else {
      setMessages((m) => m.filter((x) => x.id !== own.id));
      setText(content);
      toast.error(r.data.error ?? 'No pudimos enviar tu mensaje.');
    }
  }

  let lastDay = '';
  return (
    <div className="flex h-dvh flex-col overflow-hidden md:h-[calc(100dvh-2rem)]" style={{ background: WA.chatBg }}>
      <header className="flex shrink-0 items-center gap-1 px-1 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white" style={{ background: HEADER }}>
        <Link href={`/persons/${personaId}`} aria-label={`Volver al chat con ${persona.name}`} className="press flex h-11 w-10 shrink-0 items-center justify-center rounded-full"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></Link>
        <PersonaAvatar name={COACH_NAME} hue={COACH_HUE} size={40} icon={<GraduationCap className="h-5 w-5" aria-hidden="true" />} />
        <span className="ml-1.5 min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[17px] font-medium">{COACH_NAME}</span>
            <span className="shrink-0 rounded bg-white/20 px-1 text-[10px] font-semibold uppercase tracking-wide">Coach IA</span>
          </span>
          <span className="block truncate text-[13px] text-white/90" aria-live="polite">{typing ? 'escribiendo…' : `sobre tu chat con ${persona.name}`}</span>
        </span>
        <Link href={`/persons/${personaId}`} aria-label={`Ir al chat con ${persona.name}`} className="press mr-1 shrink-0 rounded-full">
          <PersonaAvatar name={persona.name} hue={persona.hue} src={persona.avatar} size={34} />
        </Link>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-3 py-3"
        role="log" aria-label={`Conversación con ${COACH_NAME}, tu coach`}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          <Bubble m={{ id: 'intro', role: 'coach', kind: 'text', created_at: '', content: `hola! soy ${COACH_NAME} 👋 voy viendo cómo va tu plática con ${persona.name} y te dejo ideas mientras practicas. pregúntame lo que quieras: qué contestarle, por qué se enfrió, cómo cerrar…` }} name={persona.name} gender={persona.gender} grouped={false} />
          {messages.map((m, i) => {
            const k = dayKey(m.created_at);
            const divider = k !== lastDay ? (lastDay = k, <p key={`d-${k}`} className="my-2 self-center rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-[#3B4A54] shadow-[0_1px_0_rgb(0_0_0/0.06)]">{dayLabel(m.created_at)}</p>) : null;
            const prev = messages[i - 1];
            return [divider, <Bubble key={m.id} m={m} name={persona.name} gender={persona.gender} grouped={Boolean(prev && prev.role === m.role)} />];
          })}
          {typing && <TypingDots />}
        </div>
      </div>

      <footer className="shrink-0 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-2 overflow-x-auto px-2 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {COACH_PROMPTS.map((p) => (
              <button key={p} type="button" disabled={typing} onClick={() => void send(p)}
                className="press shrink-0 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-[#3B2F8A] shadow-[0_1px_0_rgb(0_0_0/0.08)] disabled:opacity-60">
                {p}
              </button>
            ))}
          </div>
          {gate ? (
            <div className="mx-2 rounded-xl bg-white p-3 text-center text-sm shadow-soft">
              <p>Tus mensajes del plan Free se terminaron. Tu conversación está guardada.</p>
              <Link href="/persons/planes" className={buttonClass('primary', 'sm', 'mt-2 bg-[#008069] hover:bg-[#006E5A]')}>Continuar con Plus</Link>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex items-end gap-2 px-2">
              <label htmlFor="coach-composer" className="sr-only">Escríbele a {COACH_NAME}</label>
              <textarea
                id="coach-composer" value={text} rows={1} maxLength={1000}
                onChange={(e) => { setText(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${Math.min(140, e.currentTarget.scrollHeight)}px`; }}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer: coarse)').matches) { e.preventDefault(); void send(text); } }}
                placeholder="Pregúntale a tu coach"
                className="max-h-[140px] min-h-11 min-w-0 flex-1 resize-none rounded-3xl bg-white px-4 py-2.5 text-base leading-snug text-[#111B21] shadow-[0_1px_0_rgb(0_0_0/0.08)] outline-none placeholder:text-[#556770]"
              />
              <button type="submit" disabled={!text.trim() || typing} aria-label="Enviar" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-60" style={{ background: HEADER }}>
                <SendHorizontal className="h-5 w-5" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </footer>
    </div>
  );
}

function Bubble({ m, name, gender, grouped }: { m: Local; name: string; gender: Gender; grouped: boolean }) {
  const mine = m.role === 'user';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? '' : 'mt-1.5'}`}>
      <div
        className={`relative min-w-0 rounded-lg px-2.5 pb-1.5 pt-1.5 text-[15.5px] leading-snug text-[#111B21] shadow-[0_1px_0_rgb(0_0_0/0.08)] ${m.kind === 'report' ? 'w-[min(100%,26rem)]' : 'max-w-[82%]'} ${grouped ? '' : mine ? 'rounded-tr-none' : 'rounded-tl-none'}`}
        style={{ background: mine ? WA.outBubble : WA.inBubble }}
      >
        {m.kind === 'tip' && <span className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-[#5B47C2]"><Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />idea</span>}
        {m.kind === 'report' && m.report ? <ReportCard report={m.report} name={name} gender={gender} /> : <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.content}</span>}
        {m.created_at && <span className="nums float-right ml-2 mt-1.5 translate-y-0.5 text-[11px]" style={{ color: WA.time }}>{clockTime(m.created_at)}</span>}
      </div>
    </div>
  );
}

/** El feedback de la sesión dentro del chat: el resumen y las habilidades; «Ver todo» abre el detalle. */
function ReportCard({ report, name, gender }: { report: DebriefReport; name: string; gender: Gender }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#5B47C2]">Feedback de la sesión</p>
      {open ? <DebriefView report={report} name={name} gender={gender} /> : (
        <>
          <p className="leading-relaxed">{report.summary}</p>
          <ul className="flex flex-col gap-1.5">
            {SKILLS.map((s) => (
              <li key={s.id} className="flex min-w-0 items-center gap-2 text-sm">
                <span className="w-[7.5rem] shrink-0 truncate">{s.label}</span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-soi-tray" aria-hidden="true">
                  <span className="block h-full rounded-full bg-[#008069]" style={{ width: `${(report.scores[s.id] / 5) * 100}%` }} />
                </span>
                <span className="nums w-7 shrink-0 text-right font-medium">{report.scores[s.id]}/5</span>
              </li>
            ))}
          </ul>
        </>
      )}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="self-start text-sm font-medium text-[#5B47C2] underline-offset-2 [@media(hover:hover)]:hover:underline">
        {open ? 'Ver menos' : 'Ver todo: frases, emociones y señales'}
      </button>
    </div>
  );
}
