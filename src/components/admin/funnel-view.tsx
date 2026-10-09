import { analyzeFunnel, countryName } from '@/lib/analytics/funnel';
import { pct } from '@/components/admin/nav-viz';

type Funnel = ReturnType<typeof analyzeFunnel>;

const CTA: Record<string, string> = { hero: 'Botón principal (arriba)', pasos: 'Cómo funciona', precio: 'Precio', cierre: 'Cierre de la página' };
const ctaLabel = (w: string) => CTA[w] ?? (w.startsWith('tema:') ? `Tema · ${w.slice(5)}` : w);

/** Embudo landing → registro: pasos con conversión, quién se quedó a medias, de dónde vienen. */
export function FunnelView({ f }: { f: Funnel }) {
  const top = Math.max(1, f.steps[0]?.count ?? 0, ...f.steps.map((s) => s.count));
  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-3">
        {f.steps.map((s, i) => {
          const prev = i > 0 ? f.steps[i - 1]!.count : null;
          return (
            <li key={s.id} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span>{s.label}</span>
                <span className="nums shrink-0 text-soi-muted">
                  <span className="font-semibold text-soi-ink">{s.count}</span>
                  {prev && s.count <= prev ? ` · ${pct(s.count / prev)} del paso anterior` : ''}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-black/[0.05]" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-soi-accent-fill" style={{ width: `${Math.max(1.5, (s.count / top) * 100)}%` }} />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[14px] bg-soi-sidebar p-3">
          <p className="text-xs text-soi-muted">Quisieron entrar y no se registraron</p>
          <p className="nums mt-1 text-xl font-semibold">{f.abandoned}</p>
          <p className="text-xs text-soi-muted">Tocaron entrar o llegaron a /login</p>
        </div>
        <div className="rounded-[14px] bg-soi-sidebar p-3">
          <p className="text-xs text-soi-muted">Empezaron con Google o correo y no terminaron</p>
          <p className="nums mt-1 text-xl font-semibold">{f.abandonedAfterAuth}</p>
          <p className="text-xs text-soi-muted">Señal de fricción en el inicio de sesión</p>
        </div>
        <div className="rounded-[14px] bg-soi-sidebar p-3">
          <p className="text-xs text-soi-muted">Volvieron a entrar (ya tenían cuenta)</p>
          <p className="nums mt-1 text-xl font-semibold">{f.logins}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GeoTable title="Por país" rows={f.countries.map((r) => ({ ...r, label: countryName(r.country) }))} />
        <GeoTable title="Por ciudad" rows={f.cities.map((r) => ({ ...r, label: `${r.city ?? 'Ciudad desconocida'}${r.country ? `, ${countryName(r.country)}` : ''}` }))} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium text-soi-muted">Qué botón tocaron</h3>
          {f.ctas.length ? (
            <ul className="flex flex-col gap-1.5 text-sm">{f.ctas.map((c) => <li key={c.where} className="flex justify-between gap-3"><span>{ctaLabel(c.where)}</span><span className="nums text-soi-muted">{c.n}</span></li>)}</ul>
          ) : <p className="text-sm text-soi-muted">Sin datos.</p>}
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-soi-muted">De dónde llegaron a la landing</h3>
          {f.referrers.length ? (
            <ul className="flex flex-col gap-1.5 text-sm">{f.referrers.map((r) => <li key={r.host} className="flex justify-between gap-3"><span>{r.host}</span><span className="nums text-soi-muted">{r.n}</span></li>)}</ul>
          ) : <p className="text-sm text-soi-muted">Directo o sin referencia.</p>}
        </div>
      </div>
    </div>
  );
}

function GeoTable({ title, rows }: { title: string; rows: { key: string; label: string; visitors: number; wanted: number; signups: number }[] }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-soi-muted">{title}</h3>
      {rows.length ? (
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-soi-muted">
            <tr><th className="py-1.5 pr-3 font-medium">Lugar</th><th className="py-1.5 pr-3 text-right font-medium">Visitantes</th><th className="py-1.5 pr-3 text-right font-medium">Quisieron entrar</th><th className="py-1.5 text-right font-medium">Registros</th></tr>
          </thead>
          <tbody className="nums">
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-black/[0.06]">
                <td className="py-1.5 pr-3">{r.label}</td>
                <td className="py-1.5 pr-3 text-right">{r.visitors}</td>
                <td className="py-1.5 pr-3 text-right">{r.wanted}</td>
                <td className="py-1.5 text-right">{r.signups}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="text-sm text-soi-muted">Sin datos.</p>}
    </div>
  );
}
