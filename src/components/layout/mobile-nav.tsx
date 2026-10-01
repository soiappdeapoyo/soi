'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { SidebarContent, type SidebarData } from './sidebar-content';

/** Header móvil con logo + drawer accesible (<768px). */
export function MobileNav({ data }: { data: SidebarData }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-black/10 bg-soi-cream/95 px-4 backdrop-blur md:hidden">
        <button onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open} aria-controls="mobile-drawer" className="rounded-full p-2 hover:bg-black/5">
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/chat" className="text-xl font-bold">SOI<span className="text-soi-gold">.</span></Link>
        <span className="w-10" aria-hidden="true" />
      </header>

      {open && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menú" id="mobile-drawer">
          <button className="absolute inset-0 bg-black/40" aria-label="Cerrar menú" onClick={() => setOpen(false)} tabIndex={-1} />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-[300px] bg-soi-ink shadow-xl motion-safe:animate-[slidein_.2s_ease-out]">
            <button ref={closeRef} onClick={() => setOpen(false)} aria-label="Cerrar menú" className="absolute right-3 top-3 rounded-full p-2 text-white hover:bg-white/10">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent data={data} />
          </div>
        </div>
      )}
    </>
  );
}
