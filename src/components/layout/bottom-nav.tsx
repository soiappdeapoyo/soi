'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_TABS, hidesBottomNav, isTabActive } from '@/config/navigation';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';
import { isPlainClick, setPendingNav, splitHref, usePendingNav } from './pending-nav';

/**
 * Barra de navegación inferior (móvil < 768 px), estilo Instagram / Substack: un rectángulo flotante con esquinas
 * redondeadas, separado de los bordes, translúcido y solo con íconos (la etiqueta queda para lectores de pantalla).
 *
 * Decisiones de movimiento (DESIGN.md + Emil Kowalski):
 * - Se toca decenas de veces al día → cambiar de pestaña es INSTANTÁNEO: sin transición de color ni indicador animado,
 *   y la pestaña tocada se marca activa en el acto (navegación optimista, `pending-nav.ts`).
 * - Única respuesta física: el ítem se hunde al presionar (scale 0.97, 120 ms, ease-out fuerte).
 * - Activo = ícono en tinta con trazo más grueso + cápsula de fondo (no solo color).
 * - Respeta el área segura del iPhone.
 */
export function BottomNav({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const pathname = usePathname();
  const pending = usePendingNav();
  if (hidesBottomNav(pathname)) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-[22px] bg-white/85 shadow-[0_0_0_1px_rgb(11_11_11/0.06),0_8px_24px_rgb(11_11_11/0.12)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      <ul className="grid h-14 grid-cols-5 px-1.5">
        {PRIMARY_TABS.map((tab) => {
          // Al tocar, la pestaña se marca activa en el acto (no cuando el servidor termina de responder).
          const active = isTabActive(pending ? splitHref(pending).path : pathname, tab);
          return (
            <li key={tab.id} className="flex items-center justify-center">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                onClick={(e) => { if (isPlainClick(e)) setPendingNav(tab.href); }}
                className={cn(
                  'flex h-11 w-full max-w-16 select-none items-center justify-center rounded-2xl [-webkit-tap-highlight-color:transparent] [touch-action:manipulation]',
                  'transition-transform duration-(--dur-press) ease-out-strong active:scale-[0.97]',
                  active ? 'bg-black/[0.05] text-soi-ink' : 'text-soi-muted',
                )}
              >
                <span className="sr-only">{tab.label}</span>
                {tab.id === 'soi' ? (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-7 items-center rounded-lg px-2.5 text-[13px] font-semibold tracking-tight',
                      active ? 'bg-soi-ink text-white' : 'text-soi-ink shadow-[inset_0_0_0_1.5px_rgb(11_11_11/0.18)]',
                    )}
                  >
                    SOI
                  </span>
                ) : tab.id === 'yo' && avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt=""
                    data-bare
                    className={cn('h-7 w-7 rounded-full object-cover', active ? 'shadow-[0_0_0_2px_white,0_0_0_3.5px_var(--color-soi-ink)]' : 'opacity-90')}
                  />
                ) : tab.id === 'yo' ? (
                  <span
                    aria-hidden="true"
                    className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                      active ? 'bg-soi-ink text-white' : 'bg-soi-tray text-soi-muted')}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Icon name={tab.icon} className="h-[26px] w-[26px]" strokeWidth={active ? 2.25 : 1.75} />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
