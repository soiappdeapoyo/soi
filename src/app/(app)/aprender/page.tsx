import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Check } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadLearnings } from '@/lib/learning-server';
import { OUTCOME_LABEL, SOURCE_LABEL, dueLearnings } from '@/lib/learning';
import { todayISO } from '@/lib/utils';
import { LearningCheck } from '@/components/learning/learning-check';
import { NewLearning } from '@/components/learning/new-learning';

export const metadata: Metadata = { title: 'Lo que aprendes' };

/**
 * Lo que aprendes: convertir información en comportamiento. Arriba lo que toca revisar (¿funcionó?), luego
 * anotar algo nuevo con las 4 preguntas y, abajo, lo aprendido con su resultado.
 */
export default async function LearnPage({ searchParams }: { searchParams: Promise<{ fuente?: string }> }) {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login?next=/aprender');
  const [{ fuente }, profile] = await Promise.all([searchParams, getProfile(user.id)]);
  const list = await loadLearnings(supabase, user.id, 40);
  const due = dueLearnings(list, todayISO(profile?.timezone ?? 'America/Mexico_City'));
  const dueIds = new Set(due.map((l) => l.id));
  const rest = list.filter((l) => !dueIds.has(l.id));

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-5 pb-10 pt-4 md:pt-10">
      <header>
        <Link href="/mi-vida?tab=mapa" className="press -ml-1 inline-flex items-center gap-1 text-sm text-soi-muted"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mi mapa</Link>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">Lo que aprendes</h1>
        <p className="mt-1 text-[15px] text-soi-muted">Leer y ver videos no cambia nada por sí solo. Lo que cambia es lo que haces con eso.</p>
      </header>

      {due.length > 0 && (
        <section aria-labelledby="due-h">
          <h2 id="due-h" className="px-1 pb-2 text-xs font-medium text-soi-muted">¿Funcionó?</h2>
          <ul className="flex flex-col gap-3">
            {due.map((l) => (
              <li key={l.id} className="rounded-[28px] bg-soi-tray p-2">
                <div className="rounded-[20px] bg-white p-4 shadow-ring">
                  <p className="text-xs text-soi-muted">De «{l.source}»</p>
                  <p className="mt-1 text-[17px] font-medium leading-snug">Dijiste que harías: «{l.action}»</p>
                  {l.measure && <p className="mt-1 text-sm text-soi-muted">Sabrías que funcionó si: {l.measure}</p>}
                  <LearningCheck id={l.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="new-h" className="rounded-[20px] bg-white p-4 shadow-ring">
        <h2 id="new-h" className="pb-3 text-lg font-semibold tracking-tight">Aplica algo que aprendiste</h2>
        <NewLearning source={fuente?.slice(0, 200)} />
      </section>

      {rest.length > 0 && (
        <section aria-labelledby="hist-h">
          <h2 id="hist-h" className="px-1 pb-2 text-xs font-medium text-soi-muted">Lo que has aprendido</h2>
          <ul className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
            {rest.map((l) => (
              <li key={l.id} className="rounded-[14px] bg-white px-3 py-3 shadow-ring">
                <p className="flex items-center gap-2 text-xs text-soi-muted">
                  <span className="min-w-0 flex-1 truncate">{SOURCE_LABEL[l.kind]} · {l.source}</span>
                  {l.outcome && <span className={l.outcome === 'funciono' ? 'inline-flex items-center gap-1 font-medium text-soi-accent' : ''}>{l.outcome === 'funciono' && <Check className="h-3.5 w-3.5" aria-hidden="true" />}{OUTCOME_LABEL[l.outcome]}</span>}
                </p>
                <p className="mt-1 text-[15px] leading-snug">{l.learned}</p>
                {l.action && <p className="mt-1 text-sm text-soi-muted">Acción: {l.action}</p>}
                {l.outcome_note && <p className="mt-1 text-sm text-soi-muted">Lo que notaste: {l.outcome_note}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
