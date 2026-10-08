import { Fragment } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { pageLabel, type Session } from '@/lib/analytics/nav';

export const pct = (x: number) => `${Math.round(x * 100)} %`;
export const dur = (ms: number | null) => {
  if (ms === null) return '—';
  if (ms < 60_000) return `${Math.round(ms / 1000)} s`;
  const m = Math.floor(ms / 60_000);
  return m < 60 ? `${m} min ${Math.round((ms % 60_000) / 1000)} s` : `${Math.floor(m / 60)} h ${m % 60} min`;
};

/** Etiqueta de una ruta o de una cadena "A → B → C" con nombres legibles. */
export function routeLabel(path: string) {
  return path.split(' → ').map(pageLabel).join(' → ');
}

/**
 * Barras horizontales de una sola serie (magnitud): etiqueta y número siempre visibles como texto,
 * la barra solo refuerza la proporción. Una pantalla abre su flujo si se pasa `hrefFor`.
 */
export function Bars({ rows, hrefFor, unit = 'sesiones' }: {
  rows: { path: string; count: number; share: number }[];
  hrefFor?: (path: string) => string | null;
  unit?: string;
}) {
  if (!rows.length) return <p className="text-sm text-soi-muted">Sin datos en este periodo.</p>;
  const max = Math.max(...rows.map((r) => r.count));
  return (
    <ol className="flex flex-col gap-2.5">
      {rows.map((r) => {
        const href = hrefFor?.(r.path) ?? null;
        const label = routeLabel(r.path);
        return (
          <li key={r.path} className="text-sm">
            <div className="flex items-baseline justify-between gap-3">
              {href ? <Link href={href} className="min-w-0 truncate hover:underline" title={r.path}>{label}</Link> : <span className="min-w-0 truncate" title={r.path}>{label}</span>}
              <span className="nums shrink-0 text-soi-muted">{r.count} {unit} · {pct(r.share)}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-black/[0.05]" aria-hidden="true">
              <div className="h-1.5 rounded-full bg-soi-accent-fill" style={{ width: `${Math.max(2, (r.count / max) * 100)}%` }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Una sesión como recorrido: pantalla → pantalla, con el tiempo en cada una. */
export function SessionPath({ session }: { session: Session }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-1.5 text-xs">
      {session.views.map((v, i) => (
        <Fragment key={`${v.at}-${i}`}>
          {i > 0 && <li aria-hidden="true"><ArrowRight className="h-3 w-3 text-soi-subtle" /></li>}
          <li className="rounded-md bg-soi-sidebar px-2 py-1" title={v.path}>
            {pageLabel(v.path)} <span className="nums text-soi-muted">· {dur(v.dwellMs)}</span>
          </li>
        </Fragment>
      ))}
      {session.endedByLeave && <li className="pl-1 text-soi-muted">· salió de la app</li>}
    </ol>
  );
}
