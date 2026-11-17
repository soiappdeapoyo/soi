import { DOOR_IDS, DOORS } from '@/config/doors';
import { Icon } from '@/components/ui/icon';
import { DoorAction } from './door-action';

/** Elegir la puerta (si llegó a la app sin elegir en la landing). Un toque y queda. */
export function DoorPicker({ title = '¿Qué te gustaría trabajar primero?' }: { title?: string }) {
  return (
    <section aria-labelledby="elige-puerta" className="flex flex-col gap-3">
      <h2 id="elige-puerta" className="text-xl font-semibold tracking-tight">{title}</h2>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {DOOR_IDS.map((id) => {
          const d = DOORS[id];
          return (
            <li key={id}>
              <DoorAction
                body={{ action: 'choose', door: id }}
                className="press flex w-full items-start gap-3 rounded-[20px] bg-white p-4 text-left shadow-ring hover:shadow-soft disabled:opacity-60"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: d.soft, color: d.accent }}>
                  <Icon name={d.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold" style={{ color: d.accent }}>{d.label}</span>
                  <span className="block text-[15px] text-soi-muted">{d.pain}</span>
                </span>
              </DoorAction>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
