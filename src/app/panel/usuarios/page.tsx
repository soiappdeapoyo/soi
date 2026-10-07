import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { listUsers } from '@/lib/admin/data';

const d = (iso: string | null) => (iso ? new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: '2-digit' }).format(new Date(iso)) : '—');
const PLAN: Record<string, string> = { trial: 'Prueba', free: 'Free', soi_plus: 'SOI+' };

export default async function PanelUsers({ searchParams }: { searchParams: Promise<{ q?: string; p?: string }> }) {
  await requireAdmin();
  const { q = '', p = '1' } = await searchParams;
  const page = Math.max(1, Number(p) || 1);
  const { rows, total } = await listUsers(q, page);
  const pages = Math.max(1, Math.ceil(total / 50));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Usuarios <span className="nums text-base font-normal text-soi-muted">· {total}</span></h1>
        <form className="flex gap-2" role="search">
          <label htmlFor="q" className="sr-only">Buscar por correo o nombre</label>
          <input id="q" name="q" defaultValue={q} placeholder="Correo o nombre" className="h-9 w-56 rounded-lg bg-white px-3 text-sm shadow-ring" />
          <button className="press h-9 rounded-lg bg-soi-ink px-3 text-sm text-white">Buscar</button>
        </form>
      </div>
      <div className="mt-4 overflow-x-auto rounded-[14px] bg-white shadow-ring">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs text-soi-muted"><tr className="shadow-[inset_0_-1px_0_rgb(0_0_0/0.06)]">
            {['Persona', 'Plan', 'Consultas gratis', 'Registro', 'Último acceso'].map((h) => <th key={h} className="px-3 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="shadow-[inset_0_-1px_0_rgb(0_0_0/0.04)] hover:bg-soi-sidebar">
                <td className="px-3 py-2.5">
                  <Link href={`/panel/usuarios/${r.id}`} className="font-medium hover:underline">{r.name ?? 'Sin nombre'}</Link>
                  <span className="block text-xs text-soi-muted">{r.email}{r.demo ? ' · demo' : ''}</span>
                </td>
                <td className="px-3 py-2.5">{r.plan ? PLAN[r.plan] ?? r.plan : '—'}{r.plan === 'trial' && r.trialEnds ? <span className="block text-xs text-soi-muted">hasta {d(r.trialEnds)}</span> : null}</td>
                <td className="nums px-3 py-2.5">{r.plan === 'free' ? r.freeLeft ?? '—' : '—'}</td>
                <td className="nums px-3 py-2.5">{d(r.createdAt)}</td>
                <td className="nums px-3 py-2.5">{d(r.lastSignIn)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <nav className="mt-3 flex gap-2 text-sm" aria-label="Páginas">
          {page > 1 && <Link href={`/panel/usuarios?q=${encodeURIComponent(q)}&p=${page - 1}`} className="underline">Anterior</Link>}
          <span className="nums text-soi-muted">Página {page} de {pages}</span>
          {page < pages && <Link href={`/panel/usuarios?q=${encodeURIComponent(q)}&p=${page + 1}`} className="underline">Siguiente</Link>}
        </nav>
      )}
    </>
  );
}
