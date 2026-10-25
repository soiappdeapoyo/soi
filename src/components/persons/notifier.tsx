'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { ChatListItem } from '@/lib/persons/server';
import { PersonaAvatar } from './avatar';

export const CHATS_EVENT = 'persons:chats';
const POLL_MS = 15_000;

/**
 * Un solo sondeo de la lista de chats para toda la app de /persons: avisa a la lista (evento `persons:chats`) y,
 * si llega un mensaje de alguien cuyo chat no está abierto, muestra un aviso arriba (tocar → abre el chat).
 * Nunca avisa de un mensaje de un chat que ya está en pantalla.
 */
export function PersonsNotifier() {
  const pathname = usePathname();
  const router = useRouter();
  const seen = useRef<Map<string, string> | null>(null);
  const [banner, setBanner] = useState<{ id: string; name: string; hue: number; avatar: string | null; text: string } | null>(null);
  const [shown, setShown] = useState(false);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (document.visibilityState === 'visible') {
        try {
          const res = await fetch('/api/persons', { cache: 'no-store' });
          if (res.ok) {
            const { chats } = (await res.json()) as { chats: ChatListItem[] };
            window.dispatchEvent(new CustomEvent(CHATS_EVENT, { detail: chats }));
            const prev = seen.current;
            const next = new Map(chats.map((c) => [c.id, c.last?.at ?? '']));
            if (prev) {
              const fresh = chats.find((c) => c.last && c.last.role === 'persona' && prev.get(c.id) !== c.last.at && c.unread > 0 && pathRef.current !== `/persons/${c.id}`);
              if (fresh?.last) setBanner({ id: fresh.id, name: fresh.name, hue: fresh.hue, avatar: fresh.avatar, text: fresh.last.kind === 'voice' ? '🎤 Nota de voz' : fresh.last.content });
            }
            seen.current = next;
          }
        } catch { /* sin red: se intenta en el siguiente ciclo */ }
      }
      if (!stop) timer = setTimeout(poll, POLL_MS);
    }
    void poll();
    const onVisible = () => { if (document.visibilityState === 'visible') { clearTimeout(timer); void poll(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; clearTimeout(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  useEffect(() => {
    if (!banner) return;
    const raf = requestAnimationFrame(() => setShown(true));
    const hide = setTimeout(() => setShown(false), 4500);
    const clear = setTimeout(() => setBanner(null), 4800);
    return () => { cancelAnimationFrame(raf); clearTimeout(hide); clearTimeout(clear); };
  }, [banner]);

  if (!banner) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={() => { setShown(false); router.push(`/persons/${banner.id}`); }}
        className={`press pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-raised transition-[transform,opacity] duration-(--dur-enter) ease-out-strong motion-reduce:transition-none ${shown ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}
      >
        <PersonaAvatar name={banner.name} hue={banner.hue} src={banner.avatar} size={40} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{banner.name}</span>
          <span className="block truncate text-sm text-soi-muted">{banner.text}</span>
        </span>
        <span className="sr-only">Abrir el chat</span>
      </button>
    </div>
  );
}
