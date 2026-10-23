import Link from 'next/link';
import { HeartPulse, TrendingDown, TrendingUp } from 'lucide-react';
import { BAND_LABEL, WHO5_ITEMS, WHO5_LABEL, trendLine, type WeeklyEstimate } from '@/lib/wellbeing';
import type { WellbeingView } from '@/lib/wellbeing-server';

/** Línea de la evolución semanal (0–100). Sin animación: es un dato. */
function Sparkline({ history }: { history: WeeklyEstimate[] }) {
  if (history.length < 2) return null;
  const w = 120, h = 36;
  const pts = history.map((p, i) => `${((i / (history.length - 1)) * w).toFixed(1)},${(h - (p.score / 100) * h).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-[120px] overflow-visible text-soi-accent" role="img" aria-label={`Evolución semanal: ${history.map((p) => p.score).join(', ')}`}>
      <line x1="0" x2={w} y1={h / 2} y2={h / 2} className="stroke-black/10" strokeDasharray="2 3" />
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Tu bienestar: estimación del WHO-5 (0–100) con lo que la persona ya vive en SOI, sin cuestionarios.
 * Muestra la evolución y "cómo lo sé" (sus palabras y de dónde salen las señales); nunca etiquetas clínicas.
 */
export function WellbeingCard({ view }: { view: WellbeingView }) {
  const { estimate: e, history, trend, evidence } = view;
  return (
    <section aria-labelledby="wellbeing-h">
      <h2 id="wellbeing-h" className="text-lg font-semibold tracking-tight">Tu bienestar</h2>
      <p className="mb-3 mt-1 text-sm text-soi-muted">Sin cuestionarios: SOI lo deduce de lo que le cuentas y de tus Moments, en las últimas dos semanas.</p>
      {!e ? (
        <p className="flex items-start gap-2.5 rounded-[20px] bg-soi-sidebar p-4 text-[15px] text-soi-muted">
          <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />
          Aún te estoy conociendo. Conversa con SOI y vive algunos Moments: con eso verás aquí tu bienestar y cómo cambia.
        </p>
      ) : (
        <div className="rounded-[20px] bg-white p-5 shadow-soft">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="nums text-4xl font-semibold leading-none">{e.score}<span className="text-base font-normal text-soi-muted"> / 100</span></p>
              <p className="mt-1.5 text-sm font-medium">{BAND_LABEL[e.band]}</p>
            </div>
            <Sparkline history={history} />
          </div>
          {trend && (
            <p className="mt-3 flex items-start gap-2 text-[15px]">
              {trend.change >= 0
                ? <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />
                : <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-soi-muted" aria-hidden="true" />}
              {trendLine(trend)}
            </p>
          )}

          <ul className="mt-4 flex flex-col gap-2.5">
            {WHO5_ITEMS.map((i) => {
              const v = e.items[i].value;
              const known = e.items[i].weight >= 0.8 && v !== null;
              return (
                <li key={i} className="text-sm">
                  <div className="flex justify-between gap-2">
                    <span>{WHO5_LABEL[i].short}</span>
                    <span className="nums text-soi-muted">{known ? `${Math.round(v * 20)}` : 'aún sin señales'}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/5" aria-hidden="true">
                    {known && <div className="h-full rounded-full bg-soi-accent" style={{ width: `${Math.round(v * 20)}%` }} />}
                  </div>
                </li>
              );
            })}
          </ul>

          {e.band === 'muy_bajo' && (
            <p className="mt-4 rounded-[14px] bg-soi-accent-soft p-3 text-sm">
              Si llevas semanas sintiéndote así, hablar con un profesional de la salud puede ayudarte mucho. SOI te acompaña, no lo sustituye.{' '}
              <Link href="/chat?nueva=1" className="font-medium underline underline-offset-2">Hablarlo con SOI</Link>
            </p>
          )}

          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-soi-muted">Cómo lo sé</summary>
            <div className="mt-2 flex flex-col gap-2 text-soi-muted">
              <p>
                Señales de las últimas dos semanas:{' '}
                {[
                  (e.bySource.chat ?? 0) + (e.bySource.chat_rules ?? 0) && `${(e.bySource.chat ?? 0) + (e.bySource.chat_rules ?? 0)} de tus conversaciones`,
                  e.bySource.moment && `${e.bySource.moment} de tus Moments (ánimo y lo que cumples)`,
                  e.bySource.checkin && `${e.bySource.checkin} de cómo llegas a Hoy`,
                ].filter(Boolean).join(' · ')}. Confianza {e.confidence}.
              </p>
              {evidence.length > 0 && (
                <ul className="flex flex-col gap-1">
                  {evidence.map((x) => <li key={x.item}><span className="text-soi-ink">{WHO5_LABEL[x.item].short}:</span> «{x.text}»</li>)}
                </ul>
              )}
              <p className="text-xs">
                Usa los 5 puntos del Índice de Bienestar WHO-5 de la OMS (0 a 100; un cambio de 10 puntos ya cuenta), estimados con lo que vives en SOI en lugar del cuestionario. Es una estimación, no un diagnóstico.
              </p>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
