'use client';

import Link from 'next/link';
import { Drawer } from 'vaul';
import { Lock } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { buttonClass } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/use-media-query';
import { SOI_PLUS_BENEFITS } from '@/config/plans';

/**
 * Explicación de una función bloqueada (DESIGN.md §5 · Paywall).
 * Drawer inferior (Vaul) en móvil, diálogo centrado en desktop. Sin rebotes, sin urgencia falsa.
 */
export function UpgradeSheet({ open, onOpenChange, title, description }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description: string;
}) {
  const desktop = useMediaQuery('(min-width: 768px)');

  const body = (
    <>
      <ul className="flex flex-col gap-1.5 text-sm text-soi-ink/85">
        {SOI_PLUS_BENEFITS.slice(0, 4).map((b) => <li key={b} className="flex gap-2"><span aria-hidden="true">·</span>{b}</li>)}
      </ul>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onOpenChange(false)} className={buttonClass('outline')}>Ahora no</button>
        <Link href="/planes" className={buttonClass('gold')} data-autofocus>Ver SOI+</Link>
      </div>
    </>
  );

  if (desktop) {
    return <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description}>{body}</Dialog>;
  }

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-raised outline-none">
          <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10" />
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-soi-tray"><Lock className="h-5 w-5" aria-hidden="true" /></span>
          <Drawer.Title className="text-lg font-semibold">{title}</Drawer.Title>
          <Drawer.Description className="mt-1 text-sm text-soi-muted">{description}</Drawer.Description>
          <div className="mt-4">{body}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
