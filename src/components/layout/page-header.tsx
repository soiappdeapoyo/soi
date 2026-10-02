'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

type MenuItem = { href: string; label: string };

const DEFAULT_MENU: MenuItem[] = [
  { href: '/perfil', label: 'Mi perfil' },
  { href: '/ajustes', label: 'Ajustes' },
  { href: '/planes', label: 'Planes SOI+' },
];

/**
 * Encabezado de página con título discreto y menú "⋯".
 * El menú crece desde su trigger (transform-origin: top right), 150 ms entrada / 120 ms salida,
 * opacity + scale(0.95 → 1). Esc y clic fuera lo cierran; el foco vuelve al trigger.
 */
export function PageHeader({ title, menu = DEFAULT_MENU, className }: { title: string; menu?: MenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); triggerRef.current?.focus(); }
    };
    const onDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !triggerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [open]);

  return (
    <div className={cn('relative flex items-center justify-between gap-3', className)}>
      <p className="text-sm text-soi-muted">{title}</p>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="page-menu"
        aria-label="Más opciones"
        className="press flex h-11 w-11 items-center justify-center rounded-lg text-soi-ink hover:bg-black/[0.04]"
      >
        <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
      </button>
      <div
        ref={menuRef}
        id="page-menu"
        role="menu"
        data-state={open ? 'open' : 'closed'}
        aria-hidden={!open}
        style={{ '--origin': 'top right' } as React.CSSProperties}
        className="popover-motion absolute right-0 top-12 z-20 min-w-44 rounded-xl bg-white p-1 shadow-raised"
      >
        {menu.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            role="menuitem"
            tabIndex={open ? 0 : -1}
            onClick={() => setOpen(false)}
            className="press flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-black/[0.04]"
          >
            {m.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
