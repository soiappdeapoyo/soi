import { requireAdmin } from '@/lib/admin/auth';
import { outcomes } from '@/lib/admin/data';
import type { Rate } from '@/lib/admin/outcomes';

const pct = (r: Rate) => (r.pct === null ? '—' : `${r.pct} %`);
const of = (r: Rate) => (r.den ? `${r.num} de ${r.den}` : 'aún sin cohorte con edad suficiente');

/** ¿SOI de verdad ayuda? Activación, retención y transformación (sin cuentas demo ni contenido de nadie). */
export default async function OutcomesPage() {
  await requireAdmin();
  const o = await outcomes();
  const groups = [
    { title: 'Activación', note: 'De quienes se registraron hace 7+ días.', tiles: [
      { k: 'Vivió su primer Moment en 7 días', r: o.activation },
      { k: 'Escribió en el chat en 7 días', r: o.wroteFirst },
    ] },
    { title: 'Retención', note: 'Volver = escribir en el chat o terminar un Moment. Cada cohorte necesita la edad suficiente.', tiles: [
      { k: 'Día 1 (volvió al día siguiente)', r: o.d1 },
      { k: 'Semana 2 (días 7 a 13)', r: o.d7 },
      { k: 'Mes 2 (días 30 a 59)', r: o.d30 },
    ] },
    { title: 'Transformación', note: `Mapa de hace 30+ días y una medición después, en sus áreas de enfoque. Cambio promedio: ${o.transformation.avgChange === null ? '—' : `${o.transformation.avgChange > 0 ? '+' : ''}${o.transformation.avgChange} puntos`}.`, tiles: [
      { k: 'Mejoró 1+ punto en un área de enfoque', r: o.transformation.improved },
    ] },
  ];
  return (
    <>
      <h1 className="text-2xl font-semibold">Resultados</h1>
      <p className="mt-1 text-sm text-soi-muted">{o.signups} registros en los últimos 120 días (sin cuentas demo).</p>
      {groups.map((g) => (
        <section key={g.title} className="mt-6">
          <h2 className="text-lg font-semibold">{g.title}</h2>
          <p className="text-xs text-soi-muted">{g.note}</p>
          <dl className="nums mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {g.tiles.map((t) => (
              <div key={t.k} className="rounded-[14px] bg-white p-4 shadow-ring">
                <dt className="text-xs text-soi-muted">{t.k}</dt>
                <dd className="mt-1 text-2xl font-semibold">{pct(t.r)}</dd>
                <dd className="text-xs text-soi-muted">{of(t.r)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </>
  );
}
