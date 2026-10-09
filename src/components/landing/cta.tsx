'use client';

import Link from 'next/link';
import { track } from '@/components/providers/analytics';
import { trackFunnel } from '@/lib/analytics/funnel-client';

/** Enlace de la landing que se mide (qué llamado a la acción convierte). Sin datos personales. */
export function Cta({ href, where, className, children, ariaLabel }: { href: string; where: string; className?: string; children: React.ReactNode; ariaLabel?: string }) {
  return (
    <Link href={href} className={className} aria-label={ariaLabel} onClick={() => { track('landing_cta', { where, href }); trackFunnel('cta_click', where); }}>
      {children}
    </Link>
  );
}
