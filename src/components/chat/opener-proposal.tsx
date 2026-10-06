'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import type { OpenerProposal as Proposal } from '@/lib/opener';
import { track } from '@/components/providers/analytics';
import { TrackOnce } from './track-once';

const AFTER_NO = [
  { label: 'Algo más corto', text: 'Ahora no tengo tanto tiempo. Proponme algo más corto.' },
  { label: 'Otra cosa', text: 'Eso no me late ahora. Proponme otra cosa.' },
  { label: 'Solo quiero hablar', text: 'Ahora no quiero hacer un Moment, solo quiero hablar.' },
];

/**
 * La propuesta concreta con la que SOI abre: portada, por qué ahora, un toque para empezar y "Ahora no".
 * El "Ahora no" es aprendizaje: se guarda y el próximo saludo propone algo distinto.
 */
export function OpenerProposal({ p, onSend, onDecline }: { p: Proposal; onSend?: (text: string) => void; onDecline?: () => void }) {
  const [declined, setDeclined] = useState(false);

  function decline() {
    setDeclined(true);
    onDecline?.();
    track('opener_declined', { moment: p.id });
    void fetch('/api/opener/decline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) }).catch(() => {});
  }

  if (declined) {
    return (
      <section aria-live="polite" className="mt-3 max-w-md animate-enter rounded-[20px] bg-soi-sidebar p-4">
        <p className="text-[15px]">Entendido, lo tomo en cuenta. ¿Qué te vendría mejor ahora?</p>
        {onSend && (
          <div className="mt-3 flex flex-wrap gap-2">
            {AFTER_NO.map((r) => (
              <button key={r.label} type="button" onClick={() => onSend(r.text)}
                className="press h-9 rounded-full bg-white px-3 text-sm shadow-ring hover:shadow-soft">{r.label}</button>
            ))}
          </div>
        )}
      </section>
    );
  }

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
          <TrackOnce event="moment_proposed" props={{ source: 'opener', moment: p.id }} />
          <Link href={`/m/${p.id}/play?from=chat`} className={buttonClass('primary', 'sm')}><Play className="h-4 w-4" aria-hidden="true" /> {p.label}</Link>
          <button type="button" onClick={decline} className="press rounded-lg px-2 py-1.5 text-sm text-soi-muted hover:text-soi-ink">Ahora no</button>
          <Link href={`/m/${p.id}`} className="press ml-auto rounded-lg px-2 py-1.5 text-sm text-soi-muted hover:text-soi-ink">Ver</Link>
        </div>
      </div>
    </section>
  );
}
