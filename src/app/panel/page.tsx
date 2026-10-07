import { requireAdmin } from '@/lib/admin/auth';
import { overview } from '@/lib/admin/data';

const n = (v: number) => new Intl.NumberFormat('es').format(v);

/** Resumen: cuentas, actividad y uso (sin las cuentas demo). */
export default async function PanelHome() {
  await requireAdmin();
  const o = await overview();
  const tiles = [
    { k: 'Cuentas', v: o.users.total, d: `${n(o.users.new7)} nuevas en 7 días` },
    { k: 'En prueba', v: o.users.trial }, { k: 'Free', v: o.users.free }, { k: 'SOI+', v: o.users.plus },
    { k: 'Activas (7 días)', v: o.active7, d: 'escribieron en el chat' },
    { k: 'Mensajes hoy', v: o.messagesToday, d: `${n(o.messages7)} en 7 días` },
    { k: 'Tokens hoy', v: o.tokensToday, d: `${n(o.tokens7)} en 7 días` },
    { k: 'Moments completados (7 días)', v: o.runs7 },
    { k: 'Señales de crisis (7 días)', v: o.crisis7, d: 'revisa con cuidado' },
  ];
  return (
    <>
      <h1 className="text-2xl font-semibold">Resumen</h1>
      <dl className="nums mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.k} className="rounded-[14px] bg-white p-4 shadow-ring">
            <dt className="text-xs text-soi-muted">{t.k}</dt>
            <dd className="mt-1 text-2xl font-semibold">{n(t.v)}</dd>
            {t.d && <dd className="text-xs text-soi-muted">{t.d}</dd>}
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-soi-muted">Sin las cuentas demo (*.demo@soi.app).</p>
    </>
  );
}
