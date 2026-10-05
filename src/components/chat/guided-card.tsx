import Link from 'next/link';
import { Brain, Heart, Layers, Sparkles, Volume2 } from 'lucide-react';
import { buttonClass } from '@/components/ui/button';
import { GUIDED_LABEL, type GuidedKind } from '@/lib/guided';

export type GuidedResult = { ok: true; id: string | null; kind: GuidedKind; title: string; preview: string; source: string };

const ICON = { meditation: Brain, affirmations: Heart, manifestation: Sparkles } as const;

/** Meditación, afirmaciones o manifestación escritas por un agente en la conversación: escuchar o usar en un Moment. */
export function GuidedCard({ g, onSend }: { g: GuidedResult; onSend?: (text: string) => void }) {
  const I = ICON[g.kind];
  return (
    <section aria-label={`${GUIDED_LABEL[g.kind]}: ${g.title}`} className="mt-3 max-w-md rounded-[20px] bg-soi-sidebar p-3">
      <div className="rounded-lg bg-white p-4 shadow-ring">
        <p className="flex items-center gap-1.5 text-xs text-soi-muted"><I className="h-3.5 w-3.5 text-soi-accent" aria-hidden="true" /> {GUIDED_LABEL[g.kind]} escrita para ti</p>
        <h3 className="mt-1 text-[17px] font-medium">{g.title}</h3>
        <p className="mt-1 line-clamp-3 text-sm text-soi-muted">{g.preview}</p>
        {g.id && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link href={`/mi-vida/recursos/${g.id}`} className={buttonClass('primary', 'sm')}><Volume2 className="h-4 w-4" aria-hidden="true" /> Escuchar</Link>
            <Link href={`/m/nuevo?recurso=${g.id}`} className={buttonClass('outline', 'sm')}><Layers className="h-4 w-4" aria-hidden="true" /> Usar en un Moment</Link>
          </div>
        )}
        {onSend && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-3">
            <span className="text-sm text-soi-muted">¿Te hace sentido?</span>
            <button type="button" onClick={() => onSend('Sí, me sirve. Gracias.')} className="press inline-flex h-8 items-center rounded-full bg-soi-accent-soft px-3 text-sm text-soi-accent">Sí</button>
            <button type="button" onClick={() => onSend(`«${g.title}» no me hace sentido. Escríbeme otra versión distinta.`)} className="press inline-flex h-8 items-center rounded-full px-3 text-sm text-soi-ink shadow-ring">Hazme otra</button>
          </div>
        )}
      </div>
    </section>
  );
}
