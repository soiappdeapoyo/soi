import Link from 'next/link';
import { requireAdmin, audit } from '@/lib/admin/auth';
import { lastSeenNotifications, recentSignups } from '@/lib/admin/signups';
import { countryName } from '@/lib/analytics/funnel';
import { cn } from '@/lib/utils';

const when = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso));
const PROVIDER: Record<string, string> = { google: 'Google', email: 'Correo' };

/** Notificaciones del panel: cada registro nuevo, con país y ciudad. Abrir esta página las marca como vistas. */
export default async function PanelNotifications() {
  const admin = await requireAdmin();
  const [seen, signups] = await Promise.all([lastSeenNotifications(admin.id), recentSignups(30)]);
  await audit(admin.id, 'ver_notificaciones', null, { nuevos: signups.filter((s) => !seen || s.createdAt > seen).length });
  const isNew = (s: { createdAt: string }) => !seen || Date.parse(s.createdAt) > Date.parse(seen);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Notificaciones</h1>
        <p className="mt-1 text-sm text-soi-muted">
          Registros de los últimos 30 días (sin cuentas demo ni administradores). Para recibirlos también en tu teléfono, activa las notificaciones en la app: Ajustes → Notificaciones.
        </p>
      </div>
      <section className="rounded-[20px] bg-white p-5 shadow-ring">
        {signups.length ? (
          <ul className="flex flex-col">
            {signups.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-black/[0.06] py-3 text-sm first:border-0 first:pt-0">
                <span className={cn('h-2 w-2 shrink-0 self-center rounded-full', isNew(s) ? 'bg-soi-accent-fill' : 'bg-transparent')} aria-label={isNew(s) ? 'Nuevo' : undefined} />
                <Link href={`/panel/usuarios/${s.id}`} className="font-medium hover:underline">{s.name ?? s.email ?? 'Sin nombre'}</Link>
                {s.name && s.email && <span className="text-soi-muted">{s.email}</span>}
                <span className="text-soi-muted">· {s.city || s.country ? [s.city, s.region, s.country ? countryName(s.country) : null].filter(Boolean).join(', ') : 'Ubicación desconocida'}</span>
                <span className="text-soi-muted">· {PROVIDER[s.provider ?? ''] ?? s.provider ?? '—'}</span>
                <span className="nums ml-auto text-xs text-soi-subtle">{when(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-soi-muted">Sin registros en los últimos 30 días.</p>}
      </section>
    </div>
  );
}
