import Link from 'next/link';
import { analyzeFeedback, matchesFilter, type FeedbackFilter, type FeedbackRow } from '@/lib/admin/feedback';
import { RATINGS } from '@/lib/feedback';
import { pageLabel } from '@/lib/analytics/nav';
import { cn } from '@/lib/utils';

const FILTERS: { id: FeedbackFilter; label: string }[] = [
  { id: 'todas', label: 'Todas' },
  { id: 'gusta', label: 'Lo que les gusta' },
  { id: 'cambia', label: 'Lo que cambiarían' },
  { id: 'baja', label: 'Caritas bajas' },
];
const DEVICE: Record<string, string> = { android: 'Android', ios: 'iPhone', desktop: 'Computadora', other: 'Otro' };
const PLAN: Record<string, string> = { trial: 'prueba', free: 'Free', soi_plus: 'SOI+' };
const when = new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' });
const face = (v: number | null) => RATINGS.find((r) => r.value === v)?.emoji ?? '·';
const avgLabel = (v: number | null) => (v === null ? '—' : `${v} / 4`);

/**
 * «Lo que dicen» en /panel/analytics: la calificación de las caritas (promedio, reparto y por semana), por pantalla y
 * dispositivo, y los comentarios recientes con filtros. Lo que trae señales de crisis no muestra el texto.
 */
export function FeedbackView({ rows, emails, filter, path, baseHref }: {
  rows: FeedbackRow[]; emails: Map<string, string | null>; filter: FeedbackFilter; path: string | null; baseHref: string;
}) {
  const a = analyzeFeedback(rows);
  if (!a.total) return <p className="text-sm text-soi-muted">Aún nadie ha dejado su opinión. La burbuja está abajo a la derecha en la app (no en el chat ni dentro de un Moment) y se abre sola una vez, después del tercer Moment terminado o del tercer día con al menos uno.</p>;

  const link = (f: FeedbackFilter, p: string | null) => {
    const q = new URLSearchParams(baseHref.split('?')[1] ?? '');
    if (f !== 'todas') q.set('opinion', f); else q.delete('opinion');
    if (p) q.set('opinion_pantalla', p); else q.delete('opinion_pantalla');
    return `/panel/analytics?${q.toString()}#opinion`;
  };
  const list = rows.filter((r) => matchesFilter(r, filter) && (!path || (r.path ?? '(sin pantalla)') === path)).slice(0, 40);
  const maxDist = Math.max(1, ...a.distribution);
  const maxWeek = Math.max(1, ...a.weekly.map((w) => w.n));

  return (
    <div className="flex flex-col gap-5">
      <dl className="nums grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-[14px] bg-soi-sidebar p-3"><dt className="text-xs text-soi-muted">Opiniones</dt><dd className="text-xl font-semibold">{a.total}</dd><dd className="text-xs text-soi-muted">{a.people} personas · {a.prompted} al abrirse sola</dd></div>
        <div className="rounded-[14px] bg-soi-sidebar p-3"><dt className="text-xs text-soi-muted">Calificación promedio</dt><dd className="text-xl font-semibold">{avgLabel(a.avg)}</dd><dd className="text-xs text-soi-muted">{a.rated} con carita</dd></div>
        <div className="rounded-[14px] bg-soi-sidebar p-3"><dt className="text-xs text-soi-muted">Les gusta o encanta</dt><dd className="text-xl font-semibold">{a.positive.pct === null ? '—' : `${a.positive.pct} %`}</dd><dd className="text-xs text-soi-muted">{a.positive.num} de {a.positive.den}</dd></div>
        <div className="rounded-[14px] bg-soi-sidebar p-3"><dt className="text-xs text-soi-muted">Escribieron</dt><dd className="text-xl font-semibold">{a.liked} · {a.disliked}</dd><dd className="text-xs text-soi-muted">qué les gusta · qué cambiarían</dd></div>
      </dl>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium text-soi-muted">Caritas</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {RATINGS.map((r, i) => (
              <li key={r.value} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-2">
                <span><span aria-hidden="true">{r.emoji}</span> {r.label}</span>
                <span className="h-2 rounded-full bg-soi-tray"><span className="block h-full origin-left rounded-full bg-soi-accent-fill" style={{ transform: `scaleX(${a.distribution[i]! / maxDist})` }} /></span>
                <span className="nums text-right text-soi-muted">{a.distribution[i]}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-soi-muted">Por semana (últimas 8)</h3>
          <ul className="flex h-24 items-end gap-1.5" aria-label="Opiniones por semana">
            {a.weekly.map((w) => (
              <li key={w.week} className="flex h-full flex-1 flex-col items-center justify-end gap-1" title={`Semana del ${w.week}: ${w.n} opiniones, promedio ${avgLabel(w.avg)}`}>
                <span className="nums text-[10px] text-soi-muted">{w.avg ?? ''}</span>
                <span className="w-full rounded-t-md bg-soi-accent-soft" style={{ height: `${Math.max(4, (w.n / maxWeek) * 70)}%` }} />
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-soi-muted">Altura = cuántas opiniones; número = promedio de caritas (1–4).</p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium text-soi-muted">Por pantalla</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {a.byPath.slice(0, 10).map((g) => (
              <li key={g.key}>
                <Link href={link(filter, path === g.key ? null : g.key)} aria-current={path === g.key ? 'true' : undefined}
                  className={cn('flex justify-between gap-3 rounded-lg px-2 py-1 hover:bg-soi-sidebar', path === g.key && 'bg-soi-sidebar font-medium')}>
                  <span className="truncate" title={g.key}>{g.label}</span>
                  <span className="nums shrink-0 text-soi-muted">{g.n} · {avgLabel(g.avg)}{g.low ? ` · ${g.low} bajas` : ''}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-soi-muted">Por dispositivo</h3>
          <ul className="flex flex-col gap-1 px-2 text-sm">
            {a.byDevice.map((g) => (
              <li key={g.key} className="flex justify-between gap-3"><span>{DEVICE[g.key] ?? g.key}</span><span className="nums text-soi-muted">{g.n} · {avgLabel(g.avg)}{g.low ? ` · ${g.low} bajas` : ''}</span></li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <nav aria-label="Filtrar opiniones" className="mb-3 flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <Link key={f.id} href={link(f.id, path)} aria-current={filter === f.id ? 'page' : undefined}
              className={cn('press rounded-lg px-3 py-1.5 text-sm', filter === f.id ? 'bg-soi-ink text-white' : 'bg-soi-sidebar text-soi-muted hover:text-soi-ink')}>{f.label}</Link>
          ))}
          {path && <Link href={link(filter, null)} className="press rounded-lg px-3 py-1.5 text-sm text-soi-muted hover:text-soi-ink">Quitar «{pageLabel(path)}» ×</Link>}
        </nav>
        {list.length ? (
          <ul className="flex flex-col gap-3">
            {list.map((r) => (
              <li key={r.id} className="border-t border-black/[0.06] pt-3 text-sm first:border-0 first:pt-0">
                <p className="text-xs text-soi-muted">
                  <span aria-hidden="true" className="mr-1 text-base">{face(r.rating)}</span>
                  {when.format(new Date(r.created_at))} · {r.path ? pageLabel(r.path) : 'sin pantalla'} · {DEVICE[r.device ?? 'other'] ?? r.device}
                  {r.plan ? ` · ${PLAN[r.plan] ?? r.plan}` : ''}{r.account_days !== null ? ` · día ${r.account_days + 1}` : ''}
                  {r.source === 'prompt' ? ' · se abrió sola' : ''}
                  {r.user_id && <> · <Link href={`/panel/usuarios/${r.user_id}`} className="hover:underline">{emails.get(r.user_id) ?? 'persona'}</Link></>}
                </p>
                {r.crisis ? (
                  <p className="mt-1 text-soi-danger">Con señales de crisis: el texto no se muestra aquí. Se le mostraron las líneas de ayuda.</p>
                ) : (
                  <>
                    {r.liked && <p className="mt-1"><span className="font-medium">Le gusta:</span> {r.liked}</p>}
                    {r.disliked && <p className="mt-1"><span className="font-medium">Cambiaría:</span> {r.disliked}</p>}
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-soi-muted">Nada con este filtro.</p>}
      </div>
    </div>
  );
}
