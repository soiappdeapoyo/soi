'use client';

import { Drawer } from 'vaul';
import { Dialog } from '@/components/ui/dialog';
import { useMediaQuery } from '@/hooks/use-media-query';

/** Hoja inferior en el teléfono (Vaul) y diálogo centrado en la computadora, con contenido desplazable. */
export function Sheet({ open, onOpenChange, title, description, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: React.ReactNode;
}) {
  const desktop = useMediaQuery('(min-width: 768px)');
  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} className="max-w-lg">
        <div className="max-h-[70dvh] overflow-y-auto overscroll-contain pr-1">{children}</div>
      </Dialog>
    );
  }
  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-3xl bg-white shadow-raised outline-none">
          <div aria-hidden="true" className="mx-auto mb-2 mt-3 h-1.5 w-10 shrink-0 rounded-full bg-black/10" />
          <div className="px-5">
            <Drawer.Title className="text-lg font-semibold">{title}</Drawer.Title>
            {description ? <Drawer.Description className="mt-1 text-sm text-soi-muted">{description}</Drawer.Description> : <Drawer.Description className="sr-only">{title}</Drawer.Description>}
          </div>
          <div className="mt-3 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
