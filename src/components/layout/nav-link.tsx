'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Ítem del sidebar. Cambio de sección = instantáneo (alta frecuencia, DESIGN.md §1.2):
 * solo color/fondo en 120 ms y :active scale(0.97).
 */
export function NavLink({ href, className, activeClassName, children, title, ariaLabel }: {
  href: string; className?: string; activeClassName?: string; children: React.ReactNode; title?: string; ariaLabel?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [path, query] = href.split('?');
  const agent = query ? new URLSearchParams(query).get('agent') : null;
  const active = agent
    ? pathname === path && params.get('agent') === agent
    : pathname === path || (path !== '/chat' && pathname.startsWith(`${path}/`));

  return (
    <Link
      href={href}
      title={title}
      aria-label={ariaLabel}
      aria-current={active ? 'page' : undefined}
      className={cn(className, active && activeClassName)}
    >
      {children}
    </Link>
  );
}
