import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { emailsById, loadNavEvents } from '@/lib/admin/analytics';
import { loadFunnel } from '@/lib/admin/signups';
import { analyzeFilm, analyzeFunnel } from '@/lib/analytics/funnel';
import { FunnelView } from '@/components/admin/funnel-view';
import { FilmView } from '@/components/admin/film-view';
import { analyzeFlows, buildSessions, neighbors, pageLabel, type Friction } from '@/lib/analytics/nav';
import { Bars, SessionPath, dur, pct, routeLabel } from '@/components/admin/nav-viz';
import { cn } from '@/lib/utils';

const RANGES = [1, 7, 30, 90] as const;
const FRICTION: Record<Friction['kind'], string> = {
  exit: 'Aquí se van',
  bounce: 'Rebote',
  quick: 'Salida rápida',
  pingpong: 'Ida y vuelta',
};

function Card({ title, hint, children, id }: { title: string; hint?: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-[20px] bg-white p-5 shadow-ring">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mt-1 text-sm text-soi-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] bg-white p-4 shadow-ring">
      <p className="text-xs text-soi-muted">{label}</p>
      <p className="nums mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

/**
 * Analytics: cómo navegan las personas por la app, para encontrar fricciones en el flujo.
 * Con qué pantalla empiezan, a dónde van después, dónde se van, cuánto se quedan y dónde se confunden.
 */
export default async function PanelAnalytics({ searchParams }: { searchParams: Promise<{ dias?: string; pantalla?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r) === sp.dias) ?? 7;
  const [{ events, truncated, error }, funnelData] = await Promise.all([loadNavEvents({ days }), loadFunnel(days)]);
  const funnel = analyzeFunnel(funnelData.rows);
  const film = analyzeFilm(funnelData.rows);
  const sessions = buildSessions(events);
  const f = analyzeFlows(sessions);
  const focus = sp.pantalla && f.pages.some((p) => p.path === sp.pantalla) ? sp.pantalla : f.entries[0]?.path ?? null;
  const flow = focus ? neighbors(sessions, focus) : null;
  const recent = sessions.slice(0, 20);
  const emails = await emailsById([...new Set(recent.map((s) => s.userId).filter((v): v is string => Boolean(v)))]);
  const href = (path: string) => (path.includes(' → ') || path.startsWith('(') ? null : `/panel/analytics?dias=${days}&pantalla=${encodeURIComponent(path)}#flujo`);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="mt-1 text-sm text-soi-muted">Cómo navegan las personas por la app, para encontrar dónde se atoran. Sin cuentas demo ni administradores; solo rutas, nunca contenido.</p>
        </div>
        <nav aria-label="Periodo" className="flex gap-1 rounded-[14px] bg-white p-1 shadow-ring">
          {RANGES.map((r) => (
            <Link key={r} href={`/panel/analytics?dias=${r}`} aria-current={r === days ? 'page' : undefined}
              className={cn('press rounded-lg px-3 py-1.5 text-sm', r === days ? 'bg-soi-ink text-white' : 'text-soi-muted hover:text-soi-ink')}>
              {r === 1 ? '24 h' : `${r} días`}
            </Link>
          ))}
        </nav>
      </div>

      {error && <p className="rounded-[14px] bg-white p-4 text-sm shadow-ring">No se pudo leer la navegación ({error}). ¿Ya se aplicó la migración 0028?</p>}
      {truncated && <p className="text-sm text-soi-muted">Se analizaron los primeros 50 000 eventos del periodo; elige un periodo más corto para ver todo.</p>}

      <Card title="De la landing a la app" hint="Visitantes únicos (mismo navegador) en el periodo. País y ciudad aproximados por la conexión; no se guarda la IP.">
        {funnelData.error
          ? <p className="text-sm text-soi-muted">No se pudo leer el embudo ({funnelData.error}). ¿Ya se aplicó la migración 0029?</p>
          : <FunnelView f={funnel} />}
      </Card>

      <Card title="La animación «cómo funciona SOI»" hint="Visitantes únicos que llegaron a cada escena (cada quien cuenta hasta la más lejana), en la landing y en /emociones.">
        {funnelData.error
          ? <p className="text-sm text-soi-muted">No se pudo leer el embudo ({funnelData.error}). ¿Ya se aplicaron las migraciones 0029 y 0030?</p>
          : <FilmView film={film} />}
      </Card>

      <h2 className="-mb-2 mt-2 text-lg font-semibold">Dentro de la app</h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Sesiones" value={String(f.summary.sessions)} />
        <Stat label="Personas" value={String(f.summary.users)} />
        <Stat label="Pantallas vistas" value={String(f.summary.views)} />
        <Stat label="Pantallas por sesión" value={f.summary.pagesPerSession.toFixed(1)} />
        <Stat label="Duración (mediana)" value={dur(f.summary.medianSessionMs)} />
        <Stat label="Rebote" value={pct(f.summary.bounceRate)} />
      </div>

      <Card title="Fricciones detectadas" hint="Lo que más abandona, rebota o confunde (con un mínimo de casos para no alarmar por uno). Toca una para ver su flujo.">
        {f.frictions.length ? (
          <ul className="flex flex-col gap-2">
            {f.frictions.map((x) => (
              <li key={`${x.kind}-${x.path}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className="rounded-md bg-soi-sidebar px-2 py-0.5 text-xs font-medium">{FRICTION[x.kind]}</span>
                {href(x.path) ? <Link href={href(x.path)!} className="font-medium hover:underline">{routeLabel(x.path)}</Link> : <span className="font-medium">{routeLabel(x.path)}</span>}
                <span className="text-soi-muted">{x.detail}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-soi-muted">Sin fricciones claras con los datos de este periodo.</p>}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Primera pantalla de la sesión" hint="Con qué abren la app.">
          <Bars rows={f.entries} hrefFor={href} />
        </Card>
        <Card title="Dónde termina la sesión" hint="La última pantalla antes de irse.">
          <Bars rows={f.exits} hrefFor={href} />
        </Card>
      </div>

      {focus && flow && (
        <Card id="flujo" title={`Flujo de «${pageLabel(focus)}»`} hint={`${flow.views} visitas en el periodo. De dónde llegan y a dónde van después.`}>
          <form className="mb-4 flex gap-2" action="/panel/analytics#flujo">
            <input type="hidden" name="dias" value={days} />
            <label htmlFor="pantalla" className="sr-only">Pantalla</label>
            <select id="pantalla" name="pantalla" defaultValue={focus} className="h-10 min-w-0 flex-1 rounded-[12px] bg-soi-sidebar px-3 text-sm">
              {f.pages.map((p) => <option key={p.path} value={p.path}>{pageLabel(p.path)} ({p.views})</option>)}
            </select>
            <button type="submit" className="press h-10 rounded-[12px] px-4 text-sm font-medium shadow-ring">Ver</button>
          </form>
          <div className="grid gap-6 md:grid-cols-2">
            <div><h3 className="mb-3 text-sm font-medium text-soi-muted">Llegan desde</h3><Bars rows={flow.prev} hrefFor={href} unit="veces" /></div>
            <div><h3 className="mb-3 text-sm font-medium text-soi-muted">Van después a</h3><Bars rows={flow.next} hrefFor={href} unit="veces" /></div>
          </div>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Pasos más comunes" hint="De una pantalla a la siguiente.">
          <Bars rows={f.transitions.slice(0, 12)} unit="veces" />
        </Card>
        <Card title="Recorridos más comunes" hint="Las primeras 4 pantallas de cada sesión.">
          <Bars rows={f.journeys} />
        </Card>
      </div>

      <Card title="Pantallas" hint="Salida: % de visitas con las que termina la sesión. Salida rápida: se fue a otra pantalla en menos de 5 s.">
        {f.pages.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-soi-muted">
                <tr>
                  <th className="py-2 pr-3 font-medium">Pantalla</th>
                  <th className="py-2 pr-3 text-right font-medium">Visitas</th>
                  <th className="py-2 pr-3 text-right font-medium">Tiempo (mediana)</th>
                  <th className="py-2 pr-3 text-right font-medium">Salida</th>
                  <th className="py-2 pr-3 text-right font-medium">Salida rápida</th>
                  <th className="py-2 text-right font-medium">Rebotes</th>
                </tr>
              </thead>
              <tbody className="nums">
                {f.pages.map((p) => (
                  <tr key={p.path} className="border-t border-black/[0.06]">
                    <td className="py-2 pr-3"><Link href={href(p.path)!} className="hover:underline" title={p.path}>{pageLabel(p.path)}</Link></td>
                    <td className="py-2 pr-3 text-right">{p.views}</td>
                    <td className="py-2 pr-3 text-right">{dur(p.medianDwellMs)}</td>
                    <td className="py-2 pr-3 text-right">{pct(p.exitRate)}</td>
                    <td className="py-2 pr-3 text-right">{p.views ? pct(p.quickExits / p.views) : '—'}</td>
                    <td className="py-2 text-right">{p.bounces}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-sm text-soi-muted">Sin datos en este periodo.</p>}
      </Card>

      <Card title="Sesiones recientes" hint="Cada sesión, pantalla por pantalla. Toca a la persona para ver toda su navegación.">
        {recent.length ? (
          <ul className="flex flex-col gap-4">
            {recent.map((s) => (
              <li key={s.id} className="border-t border-black/[0.06] pt-3 first:border-0 first:pt-0">
                <p className="mb-1.5 text-xs text-soi-muted">
                  {new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(s.start))}
                  {' · '}{dur(Date.parse(s.end) - Date.parse(s.start))}
                  {s.userId && <> · <Link href={`/panel/usuarios/${s.userId}#navegacion`} className="hover:underline">{emails.get(s.userId) ?? 'persona'}</Link></>}
                </p>
                <SessionPath session={s} />
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-soi-muted">Aún no hay sesiones registradas.</p>}
      </Card>
    </div>
  );
}
