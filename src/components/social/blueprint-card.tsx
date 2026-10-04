import Link from 'next/link';
import { BadgeCheck, Clock, Repeat } from 'lucide-react';
import { ESLABON_LABEL } from '@/config/agents';
import { formatPrice } from '@/config/creators';
import type { SoiBlueprint } from '@/types/database';
import type { CreatorLite } from '@/lib/social/queries';

/**
 * Blueprint: un sistema que otros pueden implementar. La métrica visible es "implementado por",
 * nunca vistas ni seguidores.
 */
export function BlueprintCard({ bp, creator, href, rank, recent }: {
  bp: SoiBlueprint; creator?: CreatorLite; href?: string; rank?: number; recent?: number;
}) {
  return (
    <Link href={href ?? `/blueprints/${bp.id}`} className="press block rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
      <div className="flex items-center gap-2 text-xs text-soi-muted">
        {rank && <span className="nums font-medium text-soi-ink">#{rank}</span>}
        <span className="rounded-md bg-soi-accent-soft px-1.5 py-0.5 font-medium text-soi-accent">Blueprint</span>
        <span>{ESLABON_LABEL[bp.eslabon]}</span>
        {bp.status !== 'published' && <span className="rounded-md bg-soi-tray px-1.5 py-0.5">{bp.status === 'draft' ? 'Borrador' : 'Archivado'}</span>}
        <span className="ml-auto font-medium text-soi-ink">{bp.tier === 'premium' ? formatPrice(bp.price_cents, bp.currency) : 'Gratis'}</span>
      </div>
      <h3 className="mt-2 text-[17px] font-medium leading-snug text-soi-ink">{bp.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-soi-muted">{bp.objective}</p>
      <div className="nums mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-soi-muted">
        {creator && (
          <span className="inline-flex items-center gap-1 text-soi-ink">
            {creator.display_name}
            {creator.is_verified && <BadgeCheck className="h-3.5 w-3.5 text-soi-accent" aria-label="Creador verificado" />}
          </span>
        )}
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{bp.required_minutes} min · {bp.duration_days} días</span>
        <span className="inline-flex items-center gap-1"><Repeat className="h-3.5 w-3.5" aria-hidden="true" />
          {recent !== undefined ? `${recent} esta semana` : `Implementado por ${bp.implementations_count}`}
        </span>
      </div>
    </Link>
  );
}
