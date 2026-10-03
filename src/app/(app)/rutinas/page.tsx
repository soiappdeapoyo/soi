import Link from 'next/link';
import type { Metadata } from 'next';
import { Lock, ChevronRight } from 'lucide-react';
import { ROUTINES } from '@/config/routines';
import { ESLABON_LABEL } from '@/config/agents';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/layout/page-header';
import { PrincipioNav } from '@/components/principio/principio-nav';

export const metadata: Metadata = { title: 'Rutinas' };

export default async function RutinasPage() {
  const { user } = await getSessionUser();
  const { profile, access } = user ? await getAccessMap(user.id) : { profile: null, access: null };
  const preferred = profile?.preferred_routine;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-3 sm:px-6">
      <PageHeader title="Principio SOI" />
      <PrincipioNav initial="accion" />
      <header className="mt-2">
        <h1 className="text-2xl font-semibold">Rutinas</h1>
        <p className="mt-1 text-soi-muted">Cada rutina cita su fuente original. Elige según tu tiempo disponible.</p>
      </header>
      {/* Bandeja p-2 (32 px) → tarjetas 24 px → bloque de minutos 12 px con p-3 (concéntrico) */}
      <ul className="flex flex-col gap-2 rounded-[28px] bg-soi-tray p-2">
        {Object.values(ROUTINES).map((r, i) => (
          <li key={r.id} className="animate-enter" style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}>
            <Link href={`/rutinas/${r.id}`} className="press flex items-center gap-4 rounded-[20px] bg-white p-3 shadow-soft hover:shadow-raised">
              <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-soi-accent-soft text-soi-accent">
                <span className="nums text-lg font-semibold leading-none">{r.totalMinutes}</span><span className="text-[11px]">min</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2 font-medium">
                  {r.label}
                  {preferred === r.id && <Badge className="bg-soi-gold/20">Recomendada</Badge>}
                </span>
                <span className="block text-sm text-soi-muted">{r.author} · <em>{r.source}</em></span>
                <span className="text-xs text-soi-muted">Eslabón: {ESLABON_LABEL[r.eslabon]}</span>
              </span>
              {access && !access.routine_execution
                ? <Lock className="h-5 w-5 shrink-0 text-soi-muted" aria-label="Requiere SOI+" />
                : <ChevronRight className="h-5 w-5 shrink-0 text-soi-subtle" aria-hidden="true" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
