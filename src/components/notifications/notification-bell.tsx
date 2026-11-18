'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Drawer } from 'vaul';
import { Bell } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';
import { setNotificationCount, useNotificationCount } from '@/lib/notifications/store';
import { cn } from '@/lib/utils';

type Item = { id: string; kind: string; title: string; body: string; url: string | null; read: boolean; createdAt: string };

const TITLE = 'Notificaciones';

function when(iso: string) {
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return d === 1 ? 'Ayer' : `Hace ${d} días`;
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

/** Inicia la cuenta de la campanita con la del servidor. */
export function NotificationsSync({ initial }: { initial: number }) {
  useEffect(() => { setNotificationCount(initial); }, [initial]);
  return null;
}

/**
 * La campanita: avisos de SOI (los que escribe administración y los automáticos, como «Usa SOI un mes gratis»). Punto
 * rojo con número mientras haya sin ver; al abrirla se marcan vistos.
 */
export function NotificationBell({ className }: { className?: string }) {
  const n = useNotificationCount();
  const router = useRouter();
  const desktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);

  async function show() {
    setOpen(true);
    const res = await fetch('/api/notifications', { cache: 'no-store' }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { items?: Item[] } | null;
    const list = json?.items ?? [];
    setItems(list);
    if (list.some((i) => !i.read)) {
      setNotificationCount(0);
      void fetch('/api/notifications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
    }
  }

  function go(url: string) {
    setOpen(false);
    router.push(url);
  }

  const body = !items ? (
    <div className="flex flex-col gap-3" aria-busy="true">
      {[0, 1].map((i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
    </div>
  ) : !items.length ? (
    <p className="py-6 text-center text-sm text-soi-muted">Aquí te avisaremos de lo nuevo en SOI.</p>
  ) : (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i.id} className={cn('rounded-2xl p-3.5', i.read ? 'bg-soi-tray' : 'bg-soi-accent-soft')}>
          <div className="flex items-baseline gap-2">
            {!i.read && <span className="h-2 w-2 shrink-0 self-center rounded-full bg-[#E5484D]" aria-label="Nuevo" />}
            <p className="text-[15px] font-semibold">{i.title}</p>
            <span className="nums ml-auto shrink-0 text-xs text-soi-muted">{when(i.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-line text-sm text-soi-ink/80">{i.body}</p>
          {i.url && (
            <button type="button" onClick={() => go(i.url!)} className="press mt-2.5 rounded-full bg-soi-ink px-4 py-2 text-sm font-medium text-white">
              {i.kind === 'trial_feedback' ? 'Dar mi opinión' : 'Ver'}
            </button>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <button type="button" onClick={show} aria-label={n ? `Notificaciones: ${n} sin ver` : 'Notificaciones'}
        className={cn('press relative flex h-11 w-11 items-center justify-center rounded-lg text-soi-ink hover:bg-black/[0.04]', className)}>
        <Bell className="h-[22px] w-[22px]" aria-hidden="true" />
        {n > 0 && (
          <span aria-hidden="true" className="nums pointer-events-none absolute right-1.5 top-1.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E5484D] px-1 text-[11px] font-semibold leading-none text-white shadow-[0_0_0_2px_white]">
            {n > 9 ? '9+' : n}
          </span>
        )}
      </button>
      {desktop ? (
        <Dialog open={open} onOpenChange={setOpen} title={TITLE}>{body}</Dialog>
      ) : (
        <Drawer.Root open={open} onOpenChange={setOpen}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-black/30" />
            <Drawer.Content aria-describedby={undefined} className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-raised outline-none">
              <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10" />
              <Drawer.Title className="mb-4 text-lg font-semibold">{TITLE}</Drawer.Title>
              {body}
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </>
  );
}
