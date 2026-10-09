import { analyzeFilm } from '@/lib/analytics/funnel';
import { pct } from '@/components/admin/nav-viz';

type Film = ReturnType<typeof analyzeFilm>;

const SCENES = ['Le cuentas cómo te sientes', 'SOI te escucha primero', 'Diseña un Moment para ti', 'Lo vives guiado por voz', 'Se vuelve evidencia'];
const placeLabel = (w: string) => (w === 'landing' ? 'Landing' : w === 'emociones' ? '/emociones' : w.startsWith('emociones:') ? `/emociones/${w.slice(10)}` : w);

/** La animación "cómo funciona SOI": hasta qué escena llega la gente y si quien la ve completa se registra más. */
export function FilmView({ film }: { film: Film }) {
  if (!film.places.length) return <p className="text-sm text-soi-muted">Todavía nadie ha visto la animación en este periodo.</p>;
  const c = film.landingCompare;
  return (
    <div className="flex flex-col gap-6">
      {c && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Compare label="Vieron la animación completa (landing)" r={c.completed} />
          <Compare label="Visitaron la landing sin verla" r={c.notSeen} />
          <p className="text-xs text-soi-muted sm:col-span-2">
            Señal, no prueba: quien la ve completa suele venir más interesado. Para saberlo con certeza hace falta una prueba A/B.
          </p>
        </div>
      )}
      {film.places.map((p) => {
        const top = Math.max(1, p.scenes[0] ?? 0);
        return (
          <section key={p.where} aria-label={placeLabel(p.where)}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-medium">{placeLabel(p.where)}</h3>
              <p className="nums text-xs text-soi-muted">
                {p.viewers} la vieron · {p.pauses} pausaron · {p.taps} tocaron una escena
                {p.where !== 'landing' && p.completedSignup.visitors > 0 ? ` · ${p.completedSignup.signups} registros tras verla completa` : ''}
              </p>
            </div>
            <ol className="mt-2 flex flex-col gap-2">
              {p.scenes.map((n, i) => (
                <li key={SCENES[i]} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span><span className="nums text-soi-muted">0{i + 1}</span> {SCENES[i]}</span>
                    <span className="nums shrink-0 text-soi-muted"><span className="font-semibold text-soi-ink">{n}</span> · {pct(n / top)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-black/[0.05]" aria-hidden="true">
                    <div className="h-1.5 rounded-full bg-soi-accent-fill" style={{ width: `${Math.max(1.5, (n / top) * 100)}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

function Compare({ label, r }: { label: string; r: { visitors: number; signups: number; rate: number } }) {
  return (
    <div className="rounded-[14px] bg-soi-sidebar p-3">
      <p className="text-xs text-soi-muted">{label}</p>
      <p className="nums mt-1 text-xl font-semibold">{r.visitors ? pct(r.rate) : '—'}</p>
      <p className="nums text-xs text-soi-muted">{r.signups} registros de {r.visitors} visitantes</p>
    </div>
  );
}
