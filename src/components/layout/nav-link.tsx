'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isTabActive } from '@/config/navigation';
import { isPlainClick, setPendingNav, splitHref, usePendingNav } from './pending-nav';

/**
 * Ítem del sidebar. Cambio de sección = instantáneo (alta frecuencia, DESIGN.md §1.2):
 * solo color/fondo en 120 ms y :active scale(0.97).
 */
export function NavLink({ href, className, activeClassName, children, title, ariaLabel, match }: {
  href: string; className?: string; activeClassName?: string; children: React.ReactNode; title?: string; ariaLabel?: string;
  /** Prefijos que cuentan como activos (pestañas principales). */
  match?: readonly string[];
}) {
  const realPathname = usePathname();
  const realParams = useSearchParams();
  // Navegación optimista: mientras se abre otra pantalla, se marca como si ya estuviéramos ahí.
  const pending = usePendingNav();
  const target = pending ? splitHref(pending) : null;
  const pathname = target?.path ?? realPathname;
  const params = target?.params ?? realParams;
  const [path, query] = href.split('?');
  const q = query ? new URLSearchParams(query) : null;
  const agent = q?.get('agent') ?? null;
  const tab = q?.get('tab') ?? null;
  const active = match
    ? isTabActive(pathname, { match })
    : agent
    ? pathname === path && params.get('agent') === agent
    : tab
    ? pathname === path && (params.get('tab') ?? 'dia') === tab
    : pathname === path || (path !== '/chat' && pathname.startsWith(`${path}/`));

  return (
    <Link
      href={href}
      title={title}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      onClick={(e) => { if (isPlainClick(e)) setPendingNav(href); }}
      className={cn(className, active && activeClassName)}
    >
      {children}
    </Link>
  );
}
