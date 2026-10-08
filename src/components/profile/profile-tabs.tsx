'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isPlainClick, setPendingNav, usePendingNav } from '@/components/layout/pending-nav';

export type ProfileTab = { id: string; label: string; private?: boolean };

/**
 * Pestañas de texto estilo Substack con subrayado. Cambiar de pestaña es instantáneo (se marca al tocar, sin indicador animado:
 * se usa muchas veces). Navegan por URL (?tab=), así se pueden compartir y funcionan sin JavaScript.
 */
export function ProfileTabs({ tabs, active, base }: { tabs: ProfileTab[]; active: string; base: string }) {
  // Cambiar ?tab= no muestra el esqueleto de carga: la pestaña tocada se marca en el acto y arriba aparece
  // la barra de progreso mientras llega el contenido.
  const pending = usePendingNav();
  const hrefOf = (t: ProfileTab) => (t.id === tabs[0]!.id ? base : `${base}${base.includes('?') ? '&' : '?'}tab=${t.id}`);
  const pendingTab = tabs.find((t) => hrefOf(t) === pending)?.id;
  return (
    <nav aria-label="Secciones del perfil" className="sticky top-14 z-10 -mx-4 mt-6 bg-soi-canvas/95 px-4 shadow-[0_1px_0_rgb(11_11_11/0.08)] backdrop-blur sm:-mx-5 sm:px-5 md:top-0">
      <ul className="-mb-px flex gap-5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const on = (pendingTab ?? active) === t.id;
          return (
            <li key={t.id} className="shrink-0">
              <Link href={hrefOf(t)} scroll={false} aria-current={on ? 'page' : undefined}
                onClick={(e) => { if (isPlainClick(e) && t.id !== active) setPendingNav(hrefOf(t)); }}
                className={cn('flex h-11 items-center gap-1 border-b-2 text-[15px]',
                  on ? 'border-soi-ink font-medium text-soi-ink' : 'border-transparent text-soi-muted hover:text-soi-ink')}>
                {t.label}
                {t.private && <Lock className="h-3 w-3 text-soi-subtle" aria-label="Solo tú la ves" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function PrivateNote() {
  return (
    <p className="mb-3 flex items-center gap-1.5 text-xs text-soi-muted">
      <Lock className="h-3.5 w-3.5" aria-hidden="true" /> Solo tú ves esta pestaña.
    </p>
  );
}
