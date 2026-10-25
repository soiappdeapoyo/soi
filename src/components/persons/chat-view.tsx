'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CheckCheck, Clock, EllipsisVertical, GraduationCap, Lock, SendHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import type { ChatState, PublicMessage } from '@/lib/persons/server';
import type { PersonSpec } from '@/lib/persons/spec';
import { labelText } from '@/lib/persons/emotion';
import { BLIND_COOKIE, WA } from '@/config/persons';
import { useDismiss } from '@/hooks/use-dismiss';
import { buttonClass } from '@/components/ui/button';
import { PersonaAvatar } from './avatar';
import { VoiceBubble } from './voice-bubble';
import { TypingDots } from './typing-dots';
import { Sheet } from './sheet';
import { PersonaProfile } from './persona-profile';
import { clockTime, dayKey, dayLabel } from './time';
import { COACH_NAME } from '@/lib/persons/coach';

type Local = PublicMessage & { pending?: boolean };
type Gate = 'exhausted' | 'daily_limit' | null;

const POLL_MS = 4000;

/**
 * El chat con una persona sintética, estilo WhatsApp. Las respuestas llegan cuando la persona "puede" (agenda del
 * servidor): el cliente consulta cada pocos segundos y, si sabe cuándo empieza a escribir, despierta justo a tiempo.
 */
export function ChatView({ personaId, spec, hue, scenario, initial, gate: initialGate, blindAllowed, blind: initialBlind }: {
  personaId: string; spec: PersonSpec; hue: number; scenario: string | null; initial: ChatState; gate: Gate;
  blindAllowed: boolean; blind: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [local, setLocal] = useState<Local[]>([]);
  const [text, setText] = useState('');
  const [gate, setGate] = useState<Gate>(initialGate);
  const [now, setNow] = useState(() => Date.now());
  const [menu, setMenu] = useState(false);
  const [profile, setProfile] = useState(false);
  const [blind, setBlind] = useState(initialBlind);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const lastSeenPersona = useRef<string | null>(null);
  const atBottom = useRef(true);
  useDismiss(menuRef, menu, useCallback(() => setMenu(false), []), menuBtn);

  // Solo se vuelve a pintar si algo cambió (el sondeo no hace parpadear la pantalla).
  const lastJson = useRef('');
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/persons/${personaId}/messages`, { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.text();
      if (json === lastJson.current) return;
      lastJson.current = json;
      setState(JSON.parse(json) as ChatState);
    } catch { /* sin red: el siguiente ciclo */ }
  }, [personaId]);

  // Sondeo + despertar cuando empieza a escribir y cuando llega la respuesta.
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === 'visible') void refresh(); }, POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [refresh]);
  useEffect(() => {
    if (!state.next) return;
    const timers = [Date.parse(state.next.typingFrom), Date.parse(state.next.at) + 400].map((t) => t - Date.now()).filter((ms) => ms > 0 && ms < 3_600_000)
      .map((ms, i) => setTimeout(() => (i === 0 ? setNow(Date.now()) : void refresh()), ms));
    return () => timers.forEach(clearTimeout);
  }, [state.next, refresh]);
  // El reloj solo corre mientras viene una respuesta (para mostrar y quitar "escribiendo…").
  useEffect(() => {
    if (!state.next) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.next]);

  // Al ver mensajes nuevos del personaje, el chat queda leído.
  const lastPersona = [...state.messages].reverse().find((m) => m.role === 'persona')?.id ?? null;
  useEffect(() => {
    if (lastPersona && lastPersona !== lastSeenPersona.current) {
      lastSeenPersona.current = lastPersona;
      void fetch(`/api/persons/${personaId}/read`, { method: 'POST' }).catch(() => {});
    }
  }, [lastPersona, personaId]);

  // Los mensajes locales (enviando) desaparecen cuando el servidor ya los tiene.
  const serverIds = new Set(state.messages.map((m) => m.id));
  const shown: Local[] = [...state.messages, ...local.filter((l) => !serverIds.has(l.id))];

  // "escribiendo…" sigue hasta que su mensaje aparece (el sondeo trae el siguiente `next`): sin huecos ni parpadeos.
  const typing = state.next && now >= Date.parse(state.next.typingFrom) && now < Date.parse(state.next.at) + 15_000 ? state.next.kind : null;

  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && atBottom.current) el.scrollTop = el.scrollHeight;
  }, [shown.length, typing]);
  const subtitle = typing === 'voice' ? 'grabando audio…' : typing ? 'escribiendo…' : state.header.presence;

  async function send() {
    const content = text.trim();
    if (!content || gate || state.archived) return;
    setText('');
    const temp: Local = { id: `local-${Date.now()}`, role: 'user', kind: 'text', content, at: new Date().toISOString(), read: false, heard: undefined, emotion: undefined, photo: undefined, caption: undefined, pending: true };
    setLocal((l) => [...l, temp]);
    atBottom.current = true;
    try {
      const res = await fetch(`/api/persons/${personaId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: content }) });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string; reason?: string };
      if (res.ok && data.id) {
        setLocal((l) => l.map((m) => (m.id === temp.id ? { ...m, id: data.id!, pending: false } : m)));
      } else if (data.reason === 'exhausted' || data.reason === 'daily_limit') {
        setLocal((l) => l.filter((m) => m.id !== temp.id));
        setText(content);
        setGate(data.reason);
      } else {
        // La respuesta falló pero el mensaje quedó guardado (o no se pudo guardar): se avisa sin perder el texto.
        if (res.status !== 503) { setLocal((l) => l.filter((m) => m.id !== temp.id)); setText(content); }
        toast.error(data.error ?? 'No pudimos enviar tu mensaje.');
      }
    } catch {
      setLocal((l) => l.filter((m) => m.id !== temp.id));
      setText(content);
      toast.error('Sin conexión. Tu mensaje no se envió.');
    }
    void refresh();
  }

  const coachHref = `/persons/${personaId}/coach`;

  async function archive() {
    setMenu(false);
    const res = await fetch(`/api/persons/${personaId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'archive' }) });
    if (res.ok) { toast.success(`Archivaste el chat con ${spec.name}. Su historial queda guardado.`); router.push('/persons'); router.refresh(); }
  }

  async function unarchive() {
    const res = await fetch(`/api/persons/${personaId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unarchive' }) });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.ok) { void refresh(); router.refresh(); } else toast.error(data.error ?? 'No pudimos recuperar el chat.');
  }

  function toggleBlind() {
    setMenu(false);
    const v = !blind;
    document.cookie = `${BLIND_COOKIE}=${v ? '1' : '0'}; path=/persons; max-age=31536000; samesite=lax`;
    setBlind(v);
    void refresh();
  }

  let lastDay = '';
  return (
    <div className="flex h-dvh flex-col overflow-hidden md:h-[calc(100dvh-2rem)]" style={{ background: WA.chatBg }}>
      <header className="flex shrink-0 items-center gap-1 px-1 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] text-white" style={{ background: WA.header }}>
        <Link href="/persons" aria-label="Volver a los chats" className="press flex h-11 w-10 items-center justify-center rounded-full"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></Link>
        <button type="button" onClick={() => setProfile(true)} className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg py-1 text-left" aria-label={`Ver la ficha de ${spec.name}`}>
          <PersonaAvatar name={spec.name} hue={hue} src={state.avatar} size={40} />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[17px] font-medium">{spec.name}</span>
              <span className="shrink-0 rounded bg-white/20 px-1 text-[10px] font-semibold uppercase tracking-wide">IA</span>
            </span>
            <span className="block truncate text-[13px] text-white/90" aria-live="polite">
              {subtitle}{state.header.emotion && !typing ? ` · ${labelText(state.header.emotion, spec.gender)}` : ''}
            </span>
          </span>
        </button>
        <Link href={coachHref} aria-label={`Hablar con ${COACH_NAME}, tu coach${state.coach.unread ? ` (${state.coach.unread} sin leer)` : ''}`} className="press relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
          {state.coach.unread > 0 && <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border-2 border-[#008069]" style={{ background: WA.badge }} />}
        </Link>
        <div className="relative shrink-0">
          <button ref={menuBtn} type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Más opciones" className="press flex h-11 w-11 items-center justify-center rounded-full">
            <EllipsisVertical className="h-5 w-5" aria-hidden="true" />
          </button>
          {menu && (
            <div ref={menuRef} role="menu" className="popover-motion absolute right-1 top-12 z-30 w-64 origin-top-right overflow-hidden rounded-xl bg-white py-1.5 text-[15px] text-[#111B21] shadow-raised">
              <MenuItem onClick={() => { setMenu(false); setProfile(true); }}>Ver ficha</MenuItem>
              <MenuItem href={`/persons/${personaId}/ajustar`}>Ajustar personaje</MenuItem>
              <MenuItem href={coachHref}>Hablar con {COACH_NAME}, tu coach</MenuItem>
              <MenuItem href={`${coachHref}?feedback=1`}>Terminar sesión y recibir feedback</MenuItem>
              {blindAllowed
                ? <MenuItem onClick={toggleBlind}>{blind ? 'Mostrar su emoción' : 'Modo ciego (ocultar su emoción)'}</MenuItem>
                : <MenuItem href="/persons/planes">Modo ciego · Plus</MenuItem>}
              {!state.archived && <MenuItem onClick={archive}>Archivar chat</MenuItem>}
            </div>
          )}
        </div>
      </header>

      <div
        ref={scroller}
        onScroll={(e) => { const el = e.currentTarget; atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3"
        role="log" aria-label={`Conversación con ${spec.name}`}
      >
        <div className="mx-auto flex max-w-3xl flex-col gap-1">
          <p className="mx-auto mb-2 flex max-w-sm items-start gap-1.5 rounded-lg px-3 py-2 text-center text-[12.5px] leading-snug text-[#54471A]" style={{ background: WA.system }}>
            <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <span>{spec.name} es una persona sintética creada con IA para que practiques. Su día, su voz y sus emociones son simulados.</span>
          </p>
          {!shown.length && (
            <div className="mx-auto my-6 max-w-xs rounded-xl bg-white/80 p-4 text-center text-sm text-[#3B4A54] shadow-[0_1px_0_rgb(0_0_0/0.06)]">
              {scenario && <p className="mb-1 font-medium text-[#111B21]">{scenario}</p>}
              <p>{spec.name} aún no sabe nada de ti. Empieza tú.</p>
            </div>
          )}
          {shown.map((m, i) => {
            const k = dayKey(m.at);
            const divider = k !== lastDay ? (lastDay = k, <DateDivider key={`d-${k}`} label={dayLabel(m.at)} />) : null;
            const prev = shown[i - 1];
            const grouped = prev && prev.role === m.role && dayKey(prev.at) === k;
            return [divider, <Bubble key={m.id} m={m} personaId={personaId} grouped={Boolean(grouped)} />];
          })}
          {typing && (
            <TypingDots />
          )}
        </div>
      </div>

      <footer className="shrink-0 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        {state.coach.unread > 0 && state.coach.preview && !state.archived && (
          <Link href={coachHref} className="press mx-auto mb-1.5 flex max-w-3xl items-center gap-2 rounded-xl bg-white/95 px-3 py-2 text-left text-sm text-[#111B21] shadow-[0_1px_0_rgb(0_0_0/0.08)]">
            <GraduationCap className="h-4 w-4 shrink-0 text-[#6B4FC8]" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate"><span className="font-semibold">{COACH_NAME}:</span> {state.coach.preview}</span>
            <span className="shrink-0 text-xs font-medium text-[#6B4FC8]">Ver</span>
          </Link>
        )}
        {state.archived ? (
          <div className="mx-auto max-w-3xl rounded-xl bg-white/90 p-3 text-center text-sm text-[#3B4A54]">
            <p>Este chat está archivado. Su historial queda guardado.</p>
            <button type="button" onClick={unarchive} className="mt-1.5 font-medium text-[#005C4B] underline underline-offset-2">Recuperar chat</button>
          </div>
        ) : gate ? (
          <div className="mx-auto max-w-3xl rounded-xl bg-white p-3 text-center text-sm shadow-soft">
            {gate === 'exhausted' ? (
              <>
                <p>Tus mensajes del plan Free se terminaron. Tu conversación está guardada.</p>
                <Link href="/persons/planes" className={buttonClass('primary', 'sm', 'mt-2 bg-[#008069] hover:bg-[#006E5A]')}>Continuar con Plus</Link>
              </>
            ) : <p>Por hoy fue suficiente práctica. Descansa y retoma mañana: así se aprende mejor.</p>}
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="mx-auto flex max-w-3xl items-end gap-2">
            <label htmlFor="persons-composer" className="sr-only">Escribe un mensaje a {spec.name}</label>
            <textarea
              id="persons-composer" ref={input} value={text} rows={1} maxLength={1000}
              onChange={(e) => { setText(e.target.value); e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${Math.min(140, e.currentTarget.scrollHeight)}px`; }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !window.matchMedia('(pointer: coarse)').matches) { e.preventDefault(); void send(); } }}
              placeholder="Mensaje"
              className="max-h-[140px] min-h-11 flex-1 resize-none rounded-3xl bg-white px-4 py-2.5 text-base leading-snug text-[#111B21] shadow-[0_1px_0_rgb(0_0_0/0.08)] outline-none placeholder:text-[#556770]"
            />
            <button type="submit" disabled={!text.trim()} aria-label="Enviar" className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-60" style={{ background: WA.header }}>
              <SendHorizontal className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        )}
      </footer>

      <Sheet open={profile} onOpenChange={setProfile} title="Ficha">
        <PersonaProfile personaId={personaId} spec={spec} hue={hue} avatar={state.avatar} />
      </Sheet>
    </div>
  );
}

function MenuItem({ children, onClick, href }: { children: React.ReactNode; onClick?: () => void; href?: string }) {
  const cls = 'block w-full px-4 py-2.5 text-left active:bg-black/[0.05] [@media(hover:hover)]:hover:bg-[#F5F6F6]';
  return href ? <Link role="menuitem" href={href} className={cls}>{children}</Link> : <button role="menuitem" type="button" onClick={onClick} className={cls}>{children}</button>;
}

function DateDivider({ label }: { label: string }) {
  return <p className="my-2 self-center rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-[#3B4A54] shadow-[0_1px_0_rgb(0_0_0/0.06)]">{label}</p>;
}


function Bubble({ m, personaId, grouped }: { m: Local; personaId: string; grouped: boolean }) {
  if (m.role === 'system') {
    return <p className="my-1.5 max-w-sm self-center rounded-lg px-3 py-2 text-center text-[13px] leading-snug text-[#54471A] [overflow-wrap:anywhere]" style={{ background: WA.system }}>{m.content}</p>;
  }
  const mine = m.role === 'user';
  const time = clockTime(m.at);
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? '' : 'mt-1.5'}`}>
      <div
        className={`relative min-w-0 max-w-[82%] rounded-lg text-[15.5px] leading-snug text-[#111B21] shadow-[0_1px_0_rgb(0_0_0/0.08)] ${m.photo ? 'p-1' : 'px-2.5 pb-1.5 pt-1.5'} ${grouped ? '' : mine ? 'rounded-tr-none' : 'rounded-tl-none'}`}
        style={{ background: mine ? WA.outBubble : WA.inBubble }}
      >
        {m.photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.photo} alt={m.caption ? m.content : 'Foto'} width={260} height={260} loading="lazy" decoding="async"
              className="block aspect-square w-[min(260px,62vw)] rounded-md bg-black/5 object-cover" />
            {m.caption && <span className="block whitespace-pre-wrap px-1.5 pt-1 [overflow-wrap:anywhere]">{m.content}</span>}
          </>
        ) : m.kind === 'voice' && !mine
          ? <VoiceBubble personaId={personaId} messageId={m.id} text={m.content} />
          : <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">{m.content}</span>}
        <span className={`float-right ml-2 flex translate-y-0.5 items-center gap-0.5 text-[11px] ${m.photo ? 'mr-1 mt-1' : 'mt-1.5'}`} style={{ color: WA.time }}>
          <span className="nums">{time}</span>
          {mine && (m.pending
            ? <Clock className="h-3.5 w-3.5" aria-label="Enviando" />
            : m.read
              ? <CheckCheck className="h-4 w-4" style={{ color: WA.tick }} aria-label="Leído" />
              : <Check className="h-4 w-4" aria-label="Enviado" />)}
        </span>
      </div>
    </div>
  );
}
