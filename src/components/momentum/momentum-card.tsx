import { Plus, Minus } from 'lucide-react';
import type { MomentumResult } from '@/lib/momentum';

/**
 * Momentum Score: continuidad de transformación, no productividad.
 * Anillo con stroke-dashoffset (estático, sin animación: es un dato que se consulta, no un evento).
 */
export function MomentumCard({ m }: { m: MomentumResult }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const positives = m.signals.filter((s) => s.positive).slice(0, 4);
  const pending = m.signals.filter((s) => !s.positive).slice(0, 2);
  return (
    <section aria-labelledby="momentum-title" className="rounded-[20px] bg-soi-sidebar p-3">
      <div className="flex items-center gap-4 rounded-lg bg-white p-4 shadow-ring">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90" aria-hidden="true">
            <circle cx="40" cy="40" r={r} fill="none" stroke="rgb(11 11 11 / 0.08)" strokeWidth="5" />
            <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-soi-accent)" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={c * (1 - m.score / 100)} />
          </svg>
          <span className="nums absolute inset-0 flex items-center justify-center text-xl font-medium">{m.score}</span>
        </div>
        <div className="min-w-0">
          <h2 id="momentum-title" className="text-sm text-soi-muted">Momentum · últimos 7 días</h2>
          <p className="mt-0.5 text-[15px] text-soi-ink">
            {m.score >= 60 ? 'Vas con impulso. Aprovéchalo.' : m.score >= 30 ? 'Estás en movimiento. Un paso más hoy.' : 'Cada regreso cuenta. Empieza con algo pequeño.'}
          </p>
          <p className="nums mt-0.5 text-xs text-soi-muted">{m.activeDays} de 7 días activos</p>
        </div>
      </div>
      {(positives.length > 0 || pending.length > 0) && (
        <ul className="mt-2 space-y-1 px-2 py-1 text-sm">
          {positives.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-soi-ink"><Plus className="h-3.5 w-3.5 text-soi-accent" aria-hidden="true" />{s.label}</li>
          ))}
          {pending.map((s) => (
            <li key={s.label} className="flex items-center gap-2 text-soi-muted"><Minus className="h-3.5 w-3.5" aria-hidden="true" />{s.label}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Evidence of Transformation: no historial, evolución. Se lee como una cadena:
 * videos vistos → ideas guardadas → ejercicios → hábitos → metas.
 */
export function EvolutionChain({ steps }: { steps: { label: string; value: number }[] }) {
  return (
    <ol className="nums flex flex-col gap-1.5 rounded-[14px] bg-soi-sidebar p-1.5" aria-label="Tu evolución">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 shadow-ring">
          <span className="w-10 text-right text-xl font-medium text-soi-ink">{s.value}</span>
          <span className="flex-1 text-sm text-soi-muted">{s.label}</span>
          {i < steps.length - 1 && <span aria-hidden="true" className="text-soi-subtle">↓</span>}
        </li>
      ))}
    </ol>
  );
}
