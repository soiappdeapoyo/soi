import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ESLABON_LABEL } from '@/config/agents';
import { SOURCE_TYPES } from '@/config/creators';
import type { SoiMoment } from '@/types/database';
import { MomentActions } from './moment-actions';

/**
 * SOI Moment: una evidencia de evolución (inspiración → insight → acción), no un post.
 * Sin contadores de vanidad en grande; la resonancia es feedback, no competencia.
 */
export function MomentCard({ m, mine, showActions = true }: { m: SoiMoment; mine?: { resonance: boolean; save: boolean }; showActions?: boolean }) {
  return (
    <article className="rounded-[20px] bg-white p-4 shadow-ring">
      <div className="flex items-center gap-2 text-xs text-soi-muted">
        <span className="font-medium text-soi-ink">{m.author_name ?? 'Alguien de SOI'}</span>
        <span aria-hidden="true">·</span>
        <span>{ESLABON_LABEL[m.category]}</span>
        <span aria-hidden="true">·</span>
        <span className="truncate">{m.source_reference ? m.source_reference : SOURCE_TYPES[m.source_type]}</span>
      </div>
      <Link href={`/momentos/${m.id}`} className="group mt-2 block">
        <h3 className="text-[17px] font-medium leading-snug text-soi-ink">{m.title}</h3>
        <p className="mt-1 line-clamp-3 text-[15px] leading-relaxed text-soi-ink/85">{m.insight}</p>
        {m.actions.length > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-soi-accent">
            Lo convirtió en {m.actions.length === 1 ? '1 acción' : `${m.actions.length} acciones`}
            <ArrowRight className="h-3.5 w-3.5 transition-transform duration-(--dur-fast) ease-out-strong group-hover:translate-x-0.5" aria-hidden="true" />
          </p>
        )}
      </Link>
      {showActions && mine && <MomentActions id={m.id} resonance={m.resonance_count} saves={m.save_count} initial={mine} />}
    </article>
  );
}
