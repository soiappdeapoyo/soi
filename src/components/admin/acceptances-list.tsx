import Link from 'next/link';
import type { AcceptanceRow } from '@/lib/legal';

const d = (iso: string) => new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso));

/** Tabla del registro de aceptaciones; cada fila abre su constancia imprimible. */
export function AcceptancesList({ rows }: { rows: AcceptanceRow[] }) {
  if (!rows.length) return <p className="text-sm text-soi-muted">Sin aceptaciones registradas.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs text-soi-muted">
          <tr><th className="py-2 pr-3 font-medium">Fecha</th><th className="py-2 pr-3 font-medium">Persona</th><th className="py-2 pr-3 font-medium">IP</th><th className="py-2 font-medium"><span className="sr-only">Constancia</span></th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-black/[0.06]">
              <td className="nums py-2 pr-3 whitespace-nowrap">{d(r.accepted_at)}</td>
              <td className="py-2 pr-3"><span className="font-medium">{r.display_name ?? '—'}</span> <span className="text-soi-muted">{r.email ?? ''}</span></td>
              <td className="nums py-2 pr-3 text-soi-muted">{r.ip ?? '—'}</td>
              <td className="py-2 text-right"><Link href={`/panel/terminos/aceptaciones/${r.id}`} className="font-medium text-soi-accent hover:underline">Constancia</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
