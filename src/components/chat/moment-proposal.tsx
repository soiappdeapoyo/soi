import Link from 'next/link';
import { Lock, Play } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { ACTIONS, MOMENT_KINDS, type ActionType, type MomentKind } from '@/config/actions';

export type MomentProposalResult = {
  ok: true; id: string; title: string; kind: MomentKind; reason: string; minutes: number;
  blocks: { type: ActionType; title: string; minutes: number }[]; locked: boolean;
};

/**
 * El chat no responde con listas: SOI diseña un Moment y lo entrega listo para comenzar.
 * Tarjeta con la forma del flujo; llega con el mensaje (sin animación propia).
 */
export function MomentProposal({ m, onSend }: { m: MomentProposalResult; onSend?: (text: string) => void }) {
  return (
    <section aria-label={`Moment ${m.title}`} className="mt-3 max-w-md rounded-[20px] bg-soi-sidebar p-3">
      <div className="rounded-lg bg-white p-4 shadow-ring">
        <p className="nums text-xs text-soi-muted">Preparé un Moment de {m.minutes} minutos · {MOMENT_KINDS[m.kind]?.label}</p>
        <h3 className="mt-1 text-[17px] font-medium">{m.title}</h3>
        {m.reason && <p className="mt-0.5 text-sm text-soi-muted">{m.reason}</p>}
        <ol className="mt-3 flex flex-col gap-1.5">
          {m.blocks.map((b, i) => (
            <li key={i} className="flex items-center gap-2.5 text-sm">
              <span className="nums w-4 text-xs text-soi-subtle">{i + 1}</span>
              <Icon name={ACTIONS[b.type]?.icon ?? 'Sparkles'} className="h-4 w-4 shrink-0 text-soi-accent" />
              <span className="flex-1 truncate">{b.title}</span>
              <span className="nums text-xs text-soi-muted">{b.minutes} min</span>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex items-center gap-2">
          <Link href={`/m/${m.id}/play`} className={buttonClass(m.locked ? 'gold' : 'primary', 'sm')}>
            {m.locked ? <Lock className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />} Comenzar
          </Link>
          <Link href={`/m/${m.id}`} className="press rounded-lg px-2 py-1.5 text-sm text-soi-muted hover:text-soi-ink">Ver o editar</Link>
        </div>
        {onSend && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-black/[0.06] pt-3">
            <span className="text-sm text-soi-muted">¿Te hace sentido?</span>
            <Link href={`/m/${m.id}/play`} className="press inline-flex h-8 items-center rounded-full bg-soi-accent-soft px-3 text-sm text-soi-accent">Sí, me sirve</Link>
            <button type="button" onClick={() => onSend(`Este Moment («${m.title}») no me hace sentido hoy. Diséñame otro distinto.`)}
              className="press inline-flex h-8 items-center rounded-full px-3 text-sm text-soi-ink shadow-ring">Hazme otro</button>
          </div>
        )}
      </div>
    </section>
  );
}
