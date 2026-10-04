import Link from 'next/link';
import { BadgeCheck, Clock, Repeat } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { ACTIONS, MOMENT_KINDS } from '@/config/actions';
import { formatPrice } from '@/config/creators';
import type { MomentFlow } from '@/lib/moments/types';
import type { CreatorLite } from '@/lib/social/queries';

/**
 * Tarjeta de SOI Moment: lo que se comparte en SOI no es contenido, es una secuencia de acciones.
 * Se ve la forma del flujo (íconos de sus bloques), cuánto dura y cuántas veces se ha ejecutado.
 */
export function MomentFlowCard({ m, creator, href, badge }: { m: MomentFlow; creator?: CreatorLite; href?: string; badge?: string }) {
  const icons = m.blocks.slice(0, 7);
  const by = m.official ? `Oficial · ${m.author}` : creator?.display_name;
  return (
    <Link href={href ?? `/m/${m.id}`} className="press block rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
      <div className="flex items-center gap-2 text-xs text-soi-muted">
        {badge && <span className="rounded-md bg-soi-ink px-1.5 py-0.5 font-medium text-white">{badge}</span>}
        <span className="rounded-md bg-soi-accent-soft px-1.5 py-0.5 font-medium text-soi-accent">{MOMENT_KINDS[m.kind].label}</span>
        {m.status !== 'published' && <span className="rounded-md bg-soi-tray px-1.5 py-0.5">{m.status === 'private' ? 'Privado' : m.status === 'draft' ? 'Borrador' : 'Archivado'}</span>}
        <span className="ml-auto font-medium text-soi-ink">{m.tier === 'premium' ? formatPrice(m.price_cents, m.currency) : 'Gratis'}</span>
      </div>
      <h3 className="mt-2 text-[17px] font-medium leading-snug text-soi-ink">{m.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-soi-muted">{m.objective}</p>
      <ol className="mt-3 flex items-center gap-1" aria-label={`${m.blocks.length} acciones`}>
        {icons.map((b, i) => (
          <li key={`${b.id}-${i}`} title={ACTIONS[b.type]?.label} className="flex h-7 w-7 items-center justify-center rounded-lg bg-soi-sidebar text-soi-ink shadow-ring">
            <Icon name={ACTIONS[b.type]?.icon ?? 'Sparkles'} className="h-3.5 w-3.5" />
          </li>
        ))}
        {m.blocks.length > icons.length && <li className="nums pl-1 text-xs text-soi-muted">+{m.blocks.length - icons.length}</li>}
      </ol>
      <div className="nums mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-soi-muted">
        {by && (
          <span className="inline-flex items-center gap-1 text-soi-ink">
            {by}{creator?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-soi-accent" aria-label="Creador verificado" />}
          </span>
        )}
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{m.required_minutes} min</span>
        {!m.official && <span className="inline-flex items-center gap-1"><Repeat className="h-3.5 w-3.5" aria-hidden="true" />{m.executions_count.toLocaleString('es')} {m.executions_count === 1 ? 'ejecución' : 'ejecuciones'}</span>}
      </div>
    </Link>
  );
}
