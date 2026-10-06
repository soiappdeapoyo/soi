import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { CreatorLayer } from '@/lib/creators/profile';

/** Destacados bajo la bio: círculos con portada que filtran la cuadrícula por tema (como en Instagram). */
export function Highlights({ items, base, active, withTab = true }: { items: CreatorLayer['highlights']; base: string; active?: string | null; withTab?: boolean }) {
  if (!items.length) return null;
  const sep = base.includes('?') ? '&' : '?';
  return (
    <nav aria-label="Destacados" className="-mx-4 mt-5 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
      <ul className="flex gap-4">
        {items.map((h) => {
          const on = active === h.id;
          return (
            <li key={h.id} className="shrink-0">
              <Link href={on ? (withTab ? `${base}${sep}tab=moments` : base) : `${base}${sep}${withTab ? 'tab=moments&' : ''}destacado=${h.id}`} aria-current={on ? 'true' : undefined}
                className="press flex w-[68px] flex-col items-center gap-1.5">
                <span className={cn('block h-16 w-16 overflow-hidden rounded-full p-[2px]', on ? 'bg-soi-accent' : 'bg-black/10')}>
                  {h.cover
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={h.cover} alt="" loading="lazy" className="h-full w-full rounded-full border-2 border-white object-cover" />
                    : <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-white bg-soi-accent-soft text-lg font-semibold text-soi-accent">{h.title.charAt(0).toUpperCase()}</span>}
                </span>
                <span className="w-full truncate text-center text-xs">{h.title}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
