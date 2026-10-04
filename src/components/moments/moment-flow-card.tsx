import Link from 'next/link';
import { BadgeCheck, Clock, Repeat } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { ACTIONS, MOMENT_KINDS } from '@/config/actions';
import type { MomentFlow } from '@/lib/moments/types';
import type { CreatorLite } from '@/lib/social/queries';
import { cn } from '@/lib/utils';

type Props = {
  m: MomentFlow;
  creator?: CreatorLite;
  href?: string;
  badge?: string;
  /**
   * list: tarjeta con portada arriba (si hay) · feature: estilo artículo de Substack, título y resumen sobre la foto ·
   * tile: mosaico imagen + título para reconocer de un vistazo los Moments guardados.
   */
  variant?: 'list' | 'feature' | 'tile';
};

/**
 * Tarjeta de SOI Moment: lo que se comparte en SOI no es contenido, es una secuencia de acciones.
 * Sin precio en la tarjeta: si es de pago, se avisa al intentar comenzarlo o guardarlo.
 */
export function MomentFlowCard({ m, creator, href, badge, variant = 'list' }: Props) {
  const link = href ?? `/m/${m.id}`;
  const by = m.official ? `Oficial · ${m.author}` : creator?.display_name;

  if (variant === 'tile') {
    return (
      <Link href={link} className="press group block">
        <Cover m={m} className="aspect-[4/5] rounded-[14px]" />
        <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug text-soi-ink">{m.title}</p>
        <p className="nums text-xs text-soi-muted">{m.required_minutes} min · {MOMENT_KINDS[m.kind].label}</p>
      </Link>
    );
  }

  if (variant === 'feature' && m.cover) {
    return (
      <Link href={link} className="press block overflow-hidden rounded-[20px] bg-white shadow-ring hover:shadow-soft">
        <div className="relative">
          <Cover m={m} className="aspect-[16/10]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-white">
            <p className="text-xs font-medium text-white/85">{MOMENT_KINDS[m.kind].label} · <span className="nums">{m.required_minutes} min</span></p>
            <h3 className="mt-1 text-xl font-semibold leading-snug [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">{m.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-white/90">{m.objective}</p>
          </div>
        </div>
        <Meta m={m} by={by} creator={creator} className="px-4 py-3" />
      </Link>
    );
  }

  const icons = m.blocks.slice(0, 7);
  return (
    <Link href={link} className="press block overflow-hidden rounded-[20px] bg-white shadow-ring hover:shadow-soft">
      {m.cover && <Cover m={m} className="aspect-[16/7]" />}
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-soi-muted">
          {badge && <span className="rounded-md bg-soi-ink px-1.5 py-0.5 font-medium text-white">{badge}</span>}
          <span className="rounded-md bg-soi-accent-soft px-1.5 py-0.5 font-medium text-soi-accent">{MOMENT_KINDS[m.kind].label}</span>
          {m.status !== 'published' && <span className="rounded-md bg-soi-tray px-1.5 py-0.5">{m.status === 'private' ? 'Privado' : m.status === 'draft' ? 'Borrador' : 'Archivado'}</span>}
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
        <Meta m={m} by={by} creator={creator} className="mt-3" />
      </div>
    </Link>
  );
}

function Meta({ m, by, creator, className }: { m: MomentFlow; by?: string | null; creator?: CreatorLite; className?: string }) {
  return (
    <div className={cn('nums flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-soi-muted', className)}>
      {by && (
        <span className="inline-flex items-center gap-1 text-soi-ink">
          {by}{creator?.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-soi-accent" aria-label="Creador verificado" />}
        </span>
      )}
      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{m.required_minutes} min</span>
      {(!m.official || m.executions_count > 0) && <span className="inline-flex items-center gap-1"><Repeat className="h-3.5 w-3.5" aria-hidden="true" />{m.executions_count.toLocaleString('es')} {m.executions_count === 1 ? 'ejecución' : 'ejecuciones'}</span>}
    </div>
  );
}

/** Portada o, si no hay, un fondo con el ícono del primer bloque (para que el mosaico siga siendo reconocible). */
function Cover({ m, className }: { m: MomentFlow; className?: string }) {
  if (m.cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.cover} alt="" loading="lazy" className={cn('block w-full bg-soi-tray object-cover', className)} />;
  }
  return (
    <span aria-hidden="true" className={cn('flex w-full items-center justify-center bg-soi-accent-soft text-soi-accent', className)}>
      <Icon name={ACTIONS[m.blocks[0]?.type ?? 'timer']?.icon ?? 'Sparkles'} className="h-8 w-8" />
    </span>
  );
}
