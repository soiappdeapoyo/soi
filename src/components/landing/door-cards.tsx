import { ArrowRight } from 'lucide-react';
import { DOOR_IDS, DOORS, type DoorId } from '@/config/doors';
import { Icon } from '@/components/ui/icon';
import { Cta } from '@/components/landing/cta';
import { cn } from '@/lib/utils';

/**
 * Las 4 puertas de la landing («Tu mejor versión a un clic»). Un toque → /login con la puerta: la cuenta nueva entra
 * a esa app enfocada. `first` (del anuncio, `?puerta=`) va primero y marcado. Se mide como `puerta:<id>` (+ lugar).
 */
export function DoorCards({ where, first, dark = false }: { where: string; first?: DoorId | null; dark?: boolean }) {
  const ids = first ? [first, ...DOOR_IDS.filter((d) => d !== first)] : [...DOOR_IDS];
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {ids.map((id) => {
        const d = DOORS[id];
        return (
          <li key={id}>
            <Cta
              href={`/login?puerta=${id}`}
              where={`puerta:${id}:${where}`}
              ariaLabel={`${d.label}: ${d.pain} Entrar a ${d.app}`}
              className={cn(
                'press flex h-full items-start gap-3 rounded-[20px] p-4 text-left',
                dark ? 'bg-white text-soi-ink' : 'bg-white shadow-ring hover:shadow-soft',
              )}
            >
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: d.soft, color: d.accent }}>
                <Icon name={d.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-lg font-semibold" style={{ color: d.accent }}>{d.label}</span>
                  {id === first && <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: d.soft, color: d.accent }}>Para ti</span>}
                </span>
                <span className="mt-0.5 block text-[15px] leading-snug">{d.pain}</span>
                <span className="mt-1 block text-sm text-soi-muted">{d.promise}</span>
              </span>
              <ArrowRight aria-hidden="true" className="mt-1 h-5 w-5 shrink-0" style={{ color: d.accent }} />
            </Cta>
          </li>
        );
      })}
    </ul>
  );
}
