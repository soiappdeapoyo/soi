import Link from 'next/link';
import { BadgeCheck, Clock } from 'lucide-react';
import { ESLABON_LABEL } from '@/config/agents';
import { DIFFICULTY_LABEL, formatPrice, impactScore } from '@/config/creators';
import type { SoiBlueprint } from '@/types/database';
import type { CreatorLite } from '@/lib/social/queries';

/** Cuerpo del Blueprint, compartido por la vista dentro de la app y la página pública. */
export function BlueprintDetail({ bp, creator, creatorHref, children }: { bp: SoiBlueprint; creator?: CreatorLite; creatorHref?: string; children?: React.ReactNode }) {
  const facts = [
    { k: 'Tiempo', v: `${bp.required_minutes} min/día` },
    { k: 'Duración', v: `${bp.duration_days} días` },
    { k: 'Intensidad', v: DIFFICULTY_LABEL[bp.difficulty] },
    { k: 'Impacto', v: String(impactScore(bp)) },
  ];
  return (
    <article>
      <p className="flex flex-wrap items-center gap-2 text-xs text-soi-muted">
        <span className="rounded-md bg-soi-accent-soft px-1.5 py-0.5 font-medium text-soi-accent">Blueprint</span>
        <span>{ESLABON_LABEL[bp.eslabon]}</span>
        {bp.status !== 'published' && <span className="rounded-md bg-soi-tray px-1.5 py-0.5">{bp.status === 'draft' ? 'Borrador' : 'Archivado'}</span>}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{bp.title}</h1>
      {creator && (
        <p className="mt-2 text-sm text-soi-muted">
          por{' '}
          {creatorHref ? <Link href={creatorHref} className="font-medium text-soi-ink underline-offset-4 hover:underline">{creator.display_name}</Link> : <span className="font-medium text-soi-ink">{creator.display_name}</span>}
          {creator.is_verified && <BadgeCheck className="ml-1 inline h-4 w-4 align-[-3px] text-soi-accent" aria-label="Creador verificado" />}
        </p>
      )}
      <p className="mt-4 text-[17px] leading-relaxed text-soi-ink">{bp.objective}</p>

      <dl className="nums mt-5 grid grid-cols-2 gap-1.5 rounded-[14px] bg-soi-sidebar p-1.5 sm:grid-cols-4">
        {facts.map((f) => (
          <div key={f.k} className="rounded-lg bg-white px-3 py-2 shadow-ring">
            <dt className="text-xs text-soi-muted">{f.k}</dt>
            <dd className="text-[15px] font-medium">{f.v}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6" aria-labelledby="bp-steps">
        <h2 id="bp-steps" className="mb-2 text-sm font-medium text-soi-muted">El sistema</h2>
        <ol className="flex flex-col gap-1.5">
          {bp.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 rounded-[14px] bg-white p-3 shadow-ring">
              <span className="nums flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-soi-sidebar text-xs text-soi-muted">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{s.title}</span>
                {s.detail && <span className="mt-0.5 block text-sm text-soi-muted">{s.detail}</span>}
              </span>
              <span className="nums inline-flex shrink-0 items-center gap-1 text-xs text-soi-muted"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{s.minutes}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-soi-muted">Fuente: {bp.source}</p>
      </section>

      <p className="nums mt-5 text-sm text-soi-muted">
        Implementado por {bp.implementations_count} {bp.implementations_count === 1 ? 'persona' : 'personas'} · {bp.completions_count} lo completaron
        {bp.tier === 'premium' && <> · <span className="font-medium text-soi-ink">{formatPrice(bp.price_cents, bp.currency)}</span></>}
      </p>
      {children && <div className="mt-6">{children}</div>}
    </article>
  );
}
