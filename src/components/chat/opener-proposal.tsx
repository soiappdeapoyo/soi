import Link from 'next/link';
import { Play } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import type { OpenerProposal as Proposal } from '@/lib/opener';

/** La propuesta concreta con la que SOI abre: portada, por qué ahora y un toque para empezar. */
export function OpenerProposal({ p }: { p: Proposal }) {
  return (
    <section aria-label={`Propuesta: ${p.title}`} className="mt-3 max-w-md overflow-hidden rounded-[20px] bg-white shadow-ring">
      {p.cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={p.cover} alt="" className="aspect-[16/7] w-full object-cover" />
      )}
      <div className="p-4">
        <p className="nums text-xs text-soi-muted">Para ti, ahora · {p.minutes} min</p>
        <h3 className="mt-0.5 text-[17px] font-medium">{p.title}</h3>
        <p className="mt-1 text-sm text-soi-muted">{p.why}</p>
        <div className="mt-3 flex items-center gap-2">
          <Link href={`/m/${p.id}/play`} className={buttonClass('primary', 'sm')}><Play className="h-4 w-4" aria-hidden="true" /> {p.label}</Link>
          <Link href={`/m/${p.id}`} className="press rounded-lg px-2 py-1.5 text-sm text-soi-muted hover:text-soi-ink">Ver</Link>
        </div>
      </div>
    </section>
  );
}
