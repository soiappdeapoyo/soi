import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { auditLog } from '@/lib/admin/data';

const ACTION: Record<string, string> = {
  ajustes: 'Cambió ajustes', ver_cuenta: 'Abrió una cuenta', ver_conversacion: 'Leyó una conversación',
  extend_trial: 'Extendió la prueba', set_plan: 'Cambió el plan', reset_queries: 'Repuso consultas gratis',
};

export default async function PanelAudit() {
  await requireAdmin();
  const rows = await auditLog();
  const t = (iso: string) => new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  return (
    <>
      <h1 className="text-2xl font-semibold">Auditoría</h1>
      <p className="mt-1 text-sm text-soi-muted">Todo lo que se mira o se cambia en el panel.</p>
      <ul className="mt-4 flex flex-col gap-1.5">
        {rows.map((r) => (
          <li key={r.id as string} className="rounded-[14px] bg-white px-4 py-3 text-sm shadow-ring">
            <span className="nums text-xs text-soi-muted">{t(r.created_at as string)}</span>
            <span className="ml-2 font-medium">{ACTION[r.action as string] ?? (r.action as string)}</span>
            {r.target_user ? <Link href={`/panel/usuarios/${r.target_user}`} className="ml-2 text-soi-accent underline">ver cuenta</Link> : null}
            {r.action === 'ajustes' && <pre className="mt-1 whitespace-pre-wrap break-words text-xs text-soi-muted">{JSON.stringify(r.detail)}</pre>}
          </li>
        ))}
        {!rows.length && <li className="text-sm text-soi-muted">Aún no hay registros.</li>}
      </ul>
    </>
  );
}
