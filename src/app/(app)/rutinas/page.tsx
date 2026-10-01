import Link from 'next/link';
import type { Metadata } from 'next';
import { Lock } from 'lucide-react';
import { ROUTINES } from '@/config/routines';
import { ESLABON_LABEL } from '@/config/agents';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = { title: 'Rutinas' };

export default async function RutinasPage() {
  const { user } = await getSessionUser();
  const { profile, access } = user ? await getAccessMap(user.id) : { profile: null, access: null };
  const preferred = profile?.preferred_routine;

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-3xl font-bold">Rutinas</h1>
      <p className="mt-1 text-black/70">Cada rutina cita su fuente original. Elige según tu tiempo disponible.</p>
      <ul className="mt-6 flex flex-col gap-3">
        {Object.values(ROUTINES).map((r) => (
          <li key={r.id}>
            <Link href={`/rutinas/${r.id}`} className="flex items-center gap-4 rounded-3xl border border-black/10 bg-white p-4 hover:border-soi-gold">
              <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-soi-ink text-white">
                <span className="text-lg font-bold leading-none">{r.totalMinutes}</span><span className="text-[10px]">min</span>
              </span>
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  {r.label}
                  {preferred === r.id && <Badge className="bg-soi-gold/20">Recomendada</Badge>}
                </span>
                <span className="block text-sm text-black/70">{r.author} · <em>{r.source}</em></span>
                <span className="text-xs text-black/50">Eslabón: {ESLABON_LABEL[r.eslabon]}</span>
              </span>
              {access && !access.routine_execution && <Lock className="h-5 w-5 text-black/40" aria-label="Requiere SOI+" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
