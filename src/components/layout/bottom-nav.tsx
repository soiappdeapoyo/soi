'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PRIMARY_TABS, hidesBottomNav, isTabActive } from '@/config/navigation';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

/**
 * Barra de navegación inferior (móvil < 768 px), estilo Instagram / Substack.
 *
 * Decisiones de movimiento (DESIGN.md + Emil Kowalski):
 * - Se toca decenas de veces al día → cambiar de pestaña es INSTANTÁNEO: sin transición de color ni indicador animado.
 * - Única respuesta física: el ítem se hunde al presionar (scale 0.97, 120 ms, ease-out fuerte).
 * - El estado activo se comunica con color + trazo más grueso + etiqueta, nunca solo con color.
 * - Respeta el área segura del iPhone y queda fija sobre el contenido con un velo translúcido.
 */
export function BottomNav({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const pathname = usePathname();
  if (hidesBottomNav(pathname)) return null;

  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_rgb(11_11_11/0.06)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid h-14 max-w-md grid-cols-5">
        {PRIMARY_TABS.map((tab) => {
          const active = isTabActive(pathname, tab);
          return (
            <li key={tab.id} className="flex">
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-1 select-none flex-col items-center justify-center gap-0.5 [-webkit-tap-highlight-color:transparent] [touch-action:manipulation]',
                  'transition-transform duration-(--dur-press) ease-out-strong active:scale-[0.97]',
                  active ? 'text-soi-ink' : 'text-soi-subtle',
                )}
              >
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
                    className={cn('h-6 w-6 rounded-full object-cover', active ? 'shadow-[0_0_0_1.5px_var(--color-soi-ink)]' : 'opacity-80')}
                  />
                ) : tab.id === 'yo' ? (
                  <span
                    aria-hidden="true"
                    className={cn('flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-medium',
                      active ? 'bg-soi-ink text-white' : 'bg-soi-tray text-soi-muted')}
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <Icon name={tab.icon} className="h-6 w-6" strokeWidth={active ? 2 : 1.5} />
                )}
                <span className={cn('text-[10px] leading-none', active && 'font-medium')}>{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
