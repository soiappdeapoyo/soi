import { requireAdmin } from '@/lib/admin/auth';
import { recentBroadcasts } from '@/lib/notifications-server';
import { NotificationForm } from '@/components/admin/notification-form';
import { TRIAL_TOTAL_DAYS } from '@/lib/trial-reward';

const when = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso));

/** Avisos a la campanita de la app: escribirlos a mano y ver cuántas personas ya los vieron. */
export default async function PanelAvisos() {
  await requireAdmin();
  const sent = await recentBroadcasts();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Avisos</h1>
        <p className="mt-1 text-sm text-soi-muted">
          Llegan a la campanita de la app con un punto rojo. Automático: al terminar la prueba, «Usa SOI un mes gratis» (cada opinión escrita en la burbuja regala 7 días, hasta {TRIAL_TOTAL_DAYS}).
        </p>
      </div>
      <section className="rounded-[20px] bg-white p-5 shadow-ring"><NotificationForm /></section>
      <section className="rounded-[20px] bg-white p-5 shadow-ring">
        <h2 className="font-semibold">Enviados</h2>
        {sent.length ? (
          <ul className="mt-3 flex flex-col">
            {sent.map((s) => (
              <li key={s.id} className="border-t border-black/[0.06] py-3 text-sm first:border-0 first:pt-0">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <span className="font-medium">{s.title}</span>
                  <span className="text-soi-muted">{s.audience === 'all' ? 'Todas' : 'Una persona'} · <span className="nums">{s.read}/{s.recipients}</span> lo vieron</span>
                  <span className="nums ml-auto text-xs text-soi-subtle">{when(s.createdAt)}</span>
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-soi-muted">{s.body}</p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-soi-muted">Aún no envías avisos.</p>}
      </section>
    </div>
  );
}
