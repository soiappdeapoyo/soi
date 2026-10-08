import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';

export const metadata: Metadata = { title: 'Panel', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

const NAV = [
  { href: '/panel', label: 'Resumen' },
  { href: '/panel/usuarios', label: 'Usuarios' },
  { href: '/panel/ajustes', label: 'Ajustes' },
  { href: '/panel/terminos', label: 'Términos' },
  { href: '/panel/auditoria', label: 'Auditoría' },
];

/** Panel de administración: sin enlaces desde la app ni la landing; para quien no es administrador, no existe (404). */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-dvh bg-soi-sidebar print:bg-white">
      <header className="sticky top-0 z-10 bg-white/90 shadow-ring backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <span className="font-semibold">SOI. <span className="font-normal text-soi-muted">Panel</span></span>
          <nav aria-label="Panel" className="flex flex-wrap gap-1">
            {NAV.map((n) => <Link key={n.href} href={n.href} className="press rounded-lg px-2.5 py-1.5 text-sm text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink">{n.label}</Link>)}
          </nav>
          <span className="ml-auto truncate text-xs text-soi-subtle">{admin.email}</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
