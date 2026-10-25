'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCheck, Check, GraduationCap, Mic } from 'lucide-react';
import type { ChatListItem } from '@/lib/persons/server';
import type { CoachSummary } from '@/lib/persons/coach-server';
import { COACH_HUE, COACH_NAME } from '@/lib/persons/coach';
import { WA } from '@/config/persons';
import { PersonaAvatar } from './avatar';
import { CHATS_EVENT, type InboxEvent } from './notifier';
import { listTime } from './time';

/**
 * Lista de chats estilo WhatsApp: arriba, fija, la conversación con Ale (el coach); luego cada persona. Se actualiza
 * con el sondeo del notificador (nuevos mensajes, no leídos, orden).
 */
export function ChatList({ initial, coach: initialCoach = null, archived = false }: { initial: ChatListItem[]; coach?: CoachSummary | null; archived?: boolean }) {
  const [chats, setChats] = useState(initial);
  const [coach, setCoach] = useState(initialCoach);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (archived) return;
    const on = (e: Event) => { const d = (e as CustomEvent<InboxEvent>).detail; setChats(d.chats); setCoach(d.coach); };
    window.addEventListener(CHATS_EVENT, on);
    return () => window.removeEventListener(CHATS_EVENT, on);
  }, [archived]);

  const q = query.trim().toLowerCase();
  const shown = q ? chats.filter((c) => c.name.toLowerCase().includes(q) || c.line.toLowerCase().includes(q)) : chats;

  return (
    <div>
      {chats.length > 3 && (
        <div className="px-3 py-2">
          <label className="sr-only" htmlFor="persons-search">Buscar un chat</label>
          <input
            id="persons-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar"
            className="h-10 w-full rounded-full bg-[#F0F2F5] px-4 text-base outline-none placeholder:text-[#556770]"
          />
        </div>
      )}
      <ul>
        {!archived && !q && chats.length > 0 && <CoachRow coach={coach} />}
        {shown.map((c) => (
          <li key={c.id}>
            <Link href={`/persons/${c.id}`} className="flex items-center gap-3 px-3 py-2.5 active:bg-black/[0.04] [@media(hover:hover)]:hover:bg-[#F5F6F6]">
              <span className="relative">
                <PersonaAvatar name={c.name} hue={c.hue} src={c.avatar} size={50} />
                {c.online && <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-white" style={{ background: WA.badge }}><span className="sr-only">en línea</span></span>}
              </span>
              <span className="min-w-0 flex-1 border-b border-black/[0.06] pb-2.5">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[17px] font-medium text-[#111B21]">{c.name}</span>
                  {c.last && <span className="nums shrink-0 text-xs" style={{ color: c.unread ? '#117A3E' : WA.time }}>{listTime(c.last.at)}</span>}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <span className="flex min-w-0 flex-1 items-center gap-1 truncate text-sm" style={{ color: WA.time }}>
                    {c.last?.role === 'user' && (c.last.read
                      ? <CheckCheck className="h-4 w-4 shrink-0" style={{ color: WA.tick }} aria-label="Leído" />
                      : <Check className="h-4 w-4 shrink-0" aria-label="Enviado" />)}
                    {c.last?.kind === 'voice' && <Mic className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                    <span className="truncate">{c.last ? (c.last.kind === 'voice' ? 'Nota de voz' : c.last.content) : c.line}</span>
                  </span>
                  {c.unread > 0 && (
                    <span className="nums flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-[#0B3B1E]" style={{ background: WA.badge }}>
                      {c.unread}<span className="sr-only"> mensajes sin leer</span>
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {q && !shown.length && <p className="px-4 py-6 text-center text-sm text-soi-muted">Nadie con ese nombre.</p>}
    </div>
  );
}

/** La conversación con Ale: siempre arriba, con su último mensaje (de qué plática hablaba) y los no leídos. */
function CoachRow({ coach }: { coach: CoachSummary | null }) {
  const last = coach?.last ?? null;
  const unread = coach?.unread ?? 0;
  return (
    <li>
      <Link href="/persons/coach" className="flex items-center gap-3 px-3 py-2.5 active:bg-black/[0.04] [@media(hover:hover)]:hover:bg-[#F5F6F6]">
        <PersonaAvatar name={COACH_NAME} hue={COACH_HUE} size={50} icon={<GraduationCap className="h-6 w-6" aria-hidden="true" />} />
        <span className="min-w-0 flex-1 border-b border-black/[0.06] pb-2.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[17px] font-medium text-[#111B21]">{COACH_NAME}</span>
              <span className="shrink-0 rounded bg-[#ECE8FB] px-1 text-[10px] font-semibold uppercase tracking-wide text-[#4A3AA8]">Coach IA</span>
            </span>
            {last && <span className="nums shrink-0 text-xs" style={{ color: unread ? '#117A3E' : WA.time }}>{listTime(last.at)}</span>}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-sm" style={{ color: WA.time }}>
              {last ? `${last.role === 'user' ? 'Tú: ' : ''}${last.content}` : 'Tu coach: te deja ideas mientras practicas'}
            </span>
            {unread > 0 && (
              <span className="nums flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-[#0B3B1E]" style={{ background: WA.badge }}>
                {unread}<span className="sr-only"> mensajes sin leer</span>
              </span>
            )}
          </span>
        </span>
      </Link>
    </li>
  );
}
