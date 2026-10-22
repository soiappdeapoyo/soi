import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { analysisHistory, currentRulesAnalysis, savedAnalysis } from '@/lib/admin/pmf-data';
import { analyzePmf, STAGE_LABEL, type Level, type PmfAnalysis } from '@/lib/admin/pmf';
import { AiReadings, AnalysisBox } from '@/components/admin/pmf-panel';
import { cn } from '@/lib/utils';

export const maxDuration = 60;

const RANGES = [7, 30, 90] as const;
const LEVEL: Record<Level, { label: string; cls: string }> = {
  fuerte: { label: 'Fuerte', cls: 'bg-emerald-50 text-emerald-800' },
  medio: { label: 'Medio', cls: 'bg-amber-50 text-amber-800' },
  debil: { label: 'Débil', cls: 'bg-red-50 text-red-800' },
  sin_datos: { label: 'Sin datos', cls: 'bg-soi-sidebar text-soi-muted' },
};
const when = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso));

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[20px] bg-white p-5 shadow-ring">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-soi-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Signals({ a }: { a: PmfAnalysis }) {
  return (
    <ul className="flex flex-col divide-y divide-black/[0.06]">
      {a.signals.map((s) => (
        <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
          <span className={cn('w-[74px] shrink-0 rounded-md px-2 py-0.5 text-center text-xs font-medium', LEVEL[s.level].cls)}>{LEVEL[s.level].label}</span>
          <span className="text-xs text-soi-muted">{STAGE_LABEL[s.stage]}</span>
          <span className="min-w-0 flex-1">{s.label}</span>
          <span className="nums font-medium">{s.value}</span>
          <span className="w-full pl-[86px] text-xs text-soi-subtle">Referencia: {s.benchmark}{s.lowConfidence && s.level !== 'sin_datos' ? ' · muestra pequeña' : ''}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Analytics IA: ¿SOI tiene product-market fit? Primero el análisis por reglas con los datos de todo el panel
 * (se guarda solo si cambió) y, con un botón, la lectura de la IA. Todo queda en el historial y se copia para Claude Code.
 */
export default async function PanelAnalyticsAI({ searchParams }: { searchParams: Promise<{ dias?: string; id?: string }> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r) === sp.dias) ?? 30;

  const saved = sp.id && /^[0-9a-f-]{36}$/i.test(sp.id) ? await savedAnalysis(sp.id) : null;
  const live = saved ? null : await currentRulesAnalysis(days, admin.id);
  const [history, liveSaved] = await Promise.all([analysisHistory(), live?.saved ? savedAnalysis(live.saved.id) : null]);

  const rules = saved?.rules ?? live?.saved ?? null;
  const analysis = saved?.rules.snapshot ? analyzePmf(saved.rules.snapshot) : live?.analysis ?? null;
  const text = saved?.rules.content ?? live?.saved?.content ?? live?.analysis.text ?? '';
  const shownDays = saved?.rules.period_days ?? days;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics IA</h1>
          <p className="mt-1 max-w-2xl text-sm text-soi-muted">
            ¿SOI tiene product-market fit? Reglas sobre los datos de todo el panel (cuentas, resultados, embudo, chat de la landing,
            navegación, Moments y uso) y, si quieres, la lectura de la IA. Cada análisis se guarda y se copia listo para Claude Code.
          </p>
        </div>
        <nav aria-label="Periodo" className="flex gap-1 rounded-[14px] bg-white p-1 shadow-ring">
          {RANGES.map((r) => (
            <Link key={r} href={`/panel/analyticsAI?dias=${r}`} aria-current={!saved && r === days ? 'page' : undefined}
              className={cn('press rounded-lg px-3 py-1.5 text-sm', !saved && r === days ? 'bg-soi-ink text-white' : 'text-soi-muted hover:text-soi-ink')}>
              {r} días
            </Link>
          ))}
        </nav>
      </div>

      {saved && (
        <p className="rounded-[14px] bg-white p-3 text-sm shadow-ring">
          Viendo un análisis guardado del {when(saved.rules.created_at)} (últimos {shownDays} días).{' '}
          <Link href={`/panel/analyticsAI?dias=${shownDays}`} className="font-medium underline">Ver el de ahora</Link>
        </p>
      )}
      {sp.id && !saved && <p className="rounded-[14px] bg-white p-3 text-sm shadow-ring">No encontré ese análisis; te muestro el de ahora.</p>}
      {live?.error && (
        <p className="rounded-[14px] bg-white p-3 text-sm shadow-ring">
          El análisis se calculó pero no se pudo guardar ({live.error}). ¿Ya se aplicó la migración 0038? Sin guardarlo no se puede pedir la lectura de la IA.
        </p>
      )}

      {analysis && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-[16px] bg-white p-4 shadow-ring">
            <p className="text-xs text-soi-muted">Veredicto por reglas</p>
            <p className="mt-1 text-lg font-semibold">{analysis.verdict}</p>
          </div>
          <div className="rounded-[16px] bg-white p-4 shadow-ring">
            <p className="text-xs text-soi-muted">Puntaje PMF</p>
            <p className="nums mt-1 text-2xl font-semibold">{analysis.score === null ? '—' : `${analysis.score}/100`}</p>
          </div>
          <div className="rounded-[16px] bg-white p-4 shadow-ring">
            <p className="text-xs text-soi-muted">Cuello de botella</p>
            <p className="mt-1 text-lg font-semibold">{analysis.bottleneck ? STAGE_LABEL[analysis.bottleneck] : '—'}</p>
          </div>
        </div>
      )}

      <Card title="1. Análisis por reglas" hint="Señales de PMF con referencias de apps de suscripción de bienestar (orientativas). Se guarda automáticamente cuando los datos cambian.">
        {analysis && <Signals a={analysis} />}
        <div className="mt-5"><AnalysisBox id="pmf-rules" label="Resultado por reglas" text={text} /></div>
      </Card>

      <Card title="2. Análisis con IA" hint="La IA lee el resultado de las reglas y la foto de los datos, discrepa si hace falta y propone tareas concretas para Claude Code.">
        {rules
          ? <AiReadings key={rules.id} rulesId={rules.id} rulesText={text} initial={saved?.ai ?? liveSaved?.ai ?? []} />
          : <p className="text-sm text-soi-muted">Primero hay que guardar el análisis por reglas.</p>}
      </Card>

      <Card title="Historial" hint="Cada análisis por reglas guardado y cuántas lecturas de IA tiene.">
        {history.length ? (
          <ul className="flex flex-col divide-y divide-black/[0.06]">
            {history.map((h) => (
              <li key={h.id} className={cn('flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm', h.id === rules?.id && 'font-medium')}>
                <Link href={`/panel/analyticsAI?id=${h.id}`} className="hover:underline">{when(h.createdAt)}</Link>
                <span className="text-soi-muted">{h.days} días</span>
                <span className="min-w-0 flex-1">{h.verdict ?? '—'}{h.score === null ? '' : ` · ${h.score}/100`}</span>
                <span className="text-xs text-soi-muted">{h.ai ? `${h.ai} con IA` : 'sin IA'}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-soi-muted">Aún no hay análisis guardados.</p>}
      </Card>
    </div>
  );
}
