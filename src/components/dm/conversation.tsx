'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, ArrowUp, LifeBuoy, MoreHorizontal } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useDismiss } from '@/hooks/use-dismiss';
import { Avatar, shortTime } from '@/components/feed/avatar';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import type { DmMessage, DmMessageView } from '@/lib/social/dm';
import type { PublicAuthor } from '@/lib/social/posts';
import { cn } from '@/lib/utils';

type Props = {
  threadId: string;
  meId: string;
  other: PublicAuthor;
  initial: DmMessageView[];
  hasMore: boolean;
  canSend: boolean;
  blocked: boolean;
};

/**
 * Conversación 1 a 1. Los mensajes propios aparecen al instante; los de la otra persona llegan por Realtime
 * (sin animación de entrada: es de alta frecuencia). Auto-scroll solo si ya estabas al final.
 */
export function Conversation({ threadId, meId, other, initial, hasMore: initialMore, canSend: initialCanSend, blocked: initialBlocked }: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState(initial);
  const [hasMore, setHasMore] = useState(initialMore);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [crisis, setCrisis] = useState(false);
  const [blocked, setBlocked] = useState(initialBlocked);
  const [canSend, setCanSend] = useState(initialCanSend);
  const [menu, setMenu] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  useDismiss(menuRef, menu, useCallback(() => setMenu(false), []), menuBtn);

  const markRead = useCallback(() => { fetch(`/api/dm/threads/${threadId}/read`, { method: 'POST' }).catch(() => {}); }, [threadId]);

  // Tiempo real: mensajes nuevos y borrados en esta conversación (RLS: solo participantes).
  useEffect(() => {
    markRead();
    const supabase = createClient();
    const channel = supabase.channel(`dm:${threadId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${threadId}` }, async ({ new: row }) => {
        const m = row as DmMessage;
        if (m.sender_id === meId) return; // los propios ya se agregaron al enviar
        if (m.post_id || m.moment_id || m.moment_slug) {
          const res = await fetch(`/api/dm/threads/${threadId}/messages`);
          const json = await res.json().catch(() => null);
          if (json) setMessages(json.messages);
        } else {
          setMessages((ms) => (ms.some((x) => x.id === m.id) ? ms : [...ms, { ...m, post: null, moment: null }]));
        }
        markRead();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'dm_messages', filter: `thread_id=eq.${threadId}` }, ({ new: row }) => {
        const m = row as DmMessage;
        if (m.deleted_at) setMessages((ms) => ms.map((x) => (x.id === m.id ? { ...x, ...m, post: null, moment: null } : x)));
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [threadId, meId, markRead]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stick.current) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  async function older() {
    const first = messages[0];
    if (!first) return;
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const res = await fetch(`/api/dm/threads/${threadId}/messages?antes=${encodeURIComponent(first.created_at)}`);
    const json = await res.json().catch(() => null);
    if (!json) return;
    stick.current = false;
    setMessages((ms) => [...json.messages, ...ms]);
    setHasMore(json.more);
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
  }

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || busy) return;
    setBusy(true);
    stick.current = true;
    const res = await fetch(`/api/dm/threads/${threadId}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast(json.message ?? 'No se pudo enviar.');
      if (res.status === 403) setCanSend(false);
      return;
    }
    setText('');
    setMessages((ms) => [...ms, json.message as DmMessageView]);
    if (json.crisis) setCrisis(true);
  }

  async function removeMsg(id: string) {
    setActive(null);
    const res = await fetch(`/api/dm/messages/${id}`, { method: 'DELETE' });
    if (res.ok) setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, body: null, post: null, moment: null, deleted_at: new Date().toISOString() } : m)));
  }
  async function reportMsg(id: string) {
    setActive(null);
    const reason = window.prompt('¿Por qué reportas este mensaje? (opcional)') ?? '';
    await fetch(`/api/dm/messages/${id}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    toast('Gracias. Lo revisaremos.');
  }
  async function toggleBlock() {
    setMenu(false);
    if (!blocked && !window.confirm(`¿Bloquear a ${other.display_name}? No podrán enviarse mensajes.`)) return;
    const res = await fetch(`/api/users/${other.user_id}/block`, { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return;
    setBlocked(Boolean(json.blocked));
    setCanSend(!json.blocked && canSend);
    toast(json.blocked ? 'Bloqueado' : 'Desbloqueado');
    router.refresh();
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem-env(safe-area-inset-bottom))] max-w-2xl flex-col md:h-dvh">
      <header className="flex items-center gap-2 border-b border-black/[0.06] px-2 py-2">
        <Link href="/mensajes" aria-label="Volver a mensajes" className="press flex h-10 w-10 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]"><ArrowLeft className="h-5 w-5" aria-hidden="true" /></Link>
        <Link href={`/u/${other.user_id}`} className="press flex min-w-0 flex-1 items-center gap-2">
          <Avatar url={other.avatar_url} name={other.display_name} size={32} />
          <span className="truncate font-medium">{other.display_name}</span>
        </Link>
        <div className="relative">
          <button ref={menuBtn} type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Opciones de la conversación"
            className="press flex h-10 w-10 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]"><MoreHorizontal className="h-5 w-5" aria-hidden="true" /></button>
          {menu && (
            <div ref={menuRef} role="menu" data-state="open" style={{ '--origin': 'top right' } as React.CSSProperties} className="popover-motion absolute right-0 top-11 z-20 min-w-44 rounded-xl bg-white p-1 shadow-raised">
              <Link role="menuitem" href={`/u/${other.user_id}`} className="press flex min-h-10 items-center rounded-lg px-3 text-sm hover:bg-black/[0.04]">Ver perfil</Link>
              <button role="menuitem" type="button" onClick={toggleBlock} className="press flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-soi-danger hover:bg-black/[0.04]">{blocked ? 'Desbloquear' : 'Bloquear'}</button>
            </div>
          )}
        </div>
      </header>

      <div ref={scrollRef} onScroll={() => { const el = scrollRef.current; if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 64; }}
        className="flex-1 overflow-y-auto px-4 py-4" aria-live="polite">
        {hasMore && <div className="mb-3 text-center"><button type="button" onClick={older} className="press rounded-lg px-3 py-1.5 text-xs text-soi-muted shadow-ring">Mensajes anteriores</button></div>}
        <ul className="flex flex-col gap-1.5">
          {messages.map((m, i) => {
            const mine = m.sender_id === meId;
            const prev = messages[i - 1];
            const gap = !prev || prev.sender_id !== m.sender_id || Date.parse(m.created_at) - Date.parse(prev.created_at) > 10 * 60_000;
            return (
              <li key={m.id} className={cn('flex flex-col', mine ? 'items-end' : 'items-start', gap && i > 0 && 'mt-3')}>
                {gap && <time className="mb-1 px-1 text-[11px] text-soi-subtle" dateTime={m.created_at}>{shortTime(m.created_at)}</time>}
                {m.deleted_at ? (
                  <p className="rounded-[14px] px-3 py-2 text-sm italic text-soi-subtle shadow-ring">Mensaje eliminado</p>
                ) : (
                  <div className={cn('group flex max-w-[85%] items-center gap-1', mine && 'flex-row-reverse')}>
                  <div className={cn('min-w-0 text-left', mine ? 'rounded-[14px] rounded-br-md bg-soi-ink text-white' : 'rounded-[14px] rounded-bl-md bg-soi-tray text-soi-ink', 'px-3.5 py-2')}>
                    {m.body && <span className="block whitespace-pre-wrap break-words text-[15px] leading-relaxed">{m.body}</span>}
                    {m.post && (
                      <Link href={`/p/${m.post.id}`} className={cn('mt-1 block rounded-lg p-2.5 text-sm', mine ? 'bg-white/10' : 'bg-white shadow-ring')}>
                        <span className="block text-xs font-medium">{m.post.author.display_name}</span>
                        <span className="line-clamp-3 block">{m.post.body ?? 'Publicación'}</span>
                      </Link>
                    )}
                    {m.moment && <span className="mt-1 block w-72 max-w-full text-soi-ink"><MomentFlowCard m={m.moment} /></span>}
                  </div>
                  <button type="button" onClick={() => setActive(active === m.id ? null : m.id)} aria-expanded={active === m.id} aria-label="Opciones del mensaje"
                    className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-soi-subtle opacity-60 hover:bg-black/[0.04] focus-visible:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
                    <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                  </button>
                  </div>
                )}
                {active === m.id && !m.deleted_at && (
                  <div className="mt-1 flex gap-1">
                    {mine
                      ? <button type="button" onClick={() => removeMsg(m.id)} className="press rounded-md px-2 py-1 text-xs text-soi-danger hover:bg-black/[0.04]">Eliminar</button>
                      : <button type="button" onClick={() => reportMsg(m.id)} className="press rounded-md px-2 py-1 text-xs text-soi-muted hover:bg-black/[0.04]">Reportar</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {!messages.length && <p className="py-10 text-center text-sm text-soi-muted">Empieza la conversación con {other.display_name}.</p>}
      </div>

      {crisis && (
        <p role="status" className="mx-3 mb-2 flex items-center gap-2 rounded-[14px] bg-soi-sidebar p-3 text-sm shadow-ring">
          <LifeBuoy className="h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />
          <span>Si estás pasando por un momento difícil, no tienes que atravesarlo sin apoyo. <Link href="/chat" className="text-soi-accent underline underline-offset-4">Habla con SOI</Link>: ahí tienes líneas de ayuda.</span>
        </p>
      )}

      <div className="px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {canSend && !blocked ? (
          <form onSubmit={send} className="flex items-end gap-2 rounded-[20px] bg-white p-2 pl-4 shadow-soft focus-within:shadow-[0_0_0_1px_var(--color-soi-accent-fill),0_0_0_4px_rgb(42_120_214/0.12)]">
            <label htmlFor="dm-input" className="sr-only">Escribe un mensaje</label>
            <textarea id="dm-input" ref={inputRef} value={text} onChange={(e) => setText(e.target.value)} rows={1} maxLength={2000} placeholder="Escribe un mensaje…" enterKeyHint="send"
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-base leading-6 outline-none placeholder:text-soi-subtle" />
            <button type="submit" disabled={!text.trim() || busy} aria-label="Enviar" className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soi-ink text-white disabled:opacity-25">
              <ArrowUp className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        ) : (
          <p className="rounded-[14px] bg-soi-sidebar p-3 text-center text-sm text-soi-muted">
            {blocked ? 'Bloqueaste a esta persona.' : `Podrás escribir cuando ${other.display_name} te siga o te responda.`}
          </p>
        )}
      </div>
    </div>
  );
}
