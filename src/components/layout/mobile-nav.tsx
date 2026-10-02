'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Drawer } from 'vaul';
import { Menu, X } from 'lucide-react';
import { SidebarContent, type SidebarData } from './sidebar-content';

/**
 * Header móvil + drawer lateral con Vaul (<768px).
 * - Curva --ease-drawer, 350 ms (sobrescrito en globals.css).
 * - Cierre por gesto con inercia (Vaul decide por velocidad, no solo distancia).
 * - Radix Dialog debajo: foco atrapado, Esc cierra y devuelve el foco al trigger.
 */
export function MobileNav({ data }: { data: SidebarData }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen} direction="left">
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-soi-canvas/90 px-2 shadow-[0_1px_0_rgb(0_0_0/0.06)] backdrop-blur md:hidden">
        <Drawer.Trigger aria-label="Abrir menú" className="press flex h-11 w-11 items-center justify-center rounded-lg hover:bg-black/[0.04]">
          <Menu className="h-6 w-6" aria-hidden="true" />
        </Drawer.Trigger>
        <Link href="/chat" className="press text-xl font-semibold tracking-tight">SOI.</Link>
        <span className="w-11" aria-hidden="true" />
      </header>

      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-40 bg-black/30" />
        <Drawer.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[85%] max-w-[300px] flex-col bg-soi-sidebar shadow-raised outline-none"
        >
          <Drawer.Title className="sr-only">Menú</Drawer.Title>
          <Drawer.Close aria-label="Cerrar menú" className="press absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-lg hover:bg-black/[0.04]">
            <X className="h-5 w-5" aria-hidden="true" />
          </Drawer.Close>
          <SidebarContent data={data} />
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
