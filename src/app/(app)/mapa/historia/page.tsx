import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Flag, Lock } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadTimeline } from '@/lib/timeline-server';
import { KIND_LABEL, groupByMonth, yearAgo } from '@/lib/timeline';
import { loadChapterDue, loadChapters } from '@/lib/chapters-server';
import { CHAPTER_DAYS, addDays, daysUntilNext, snapshotLines } from '@/lib/chapters';
import { todayISO } from '@/lib/utils';

export const metadata: Metadata = { title: 'Tu historia' };

const fmt = (d: string) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${d}T12:00:00Z`));
const fmtAt = (at: string, timeZone: string) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone }).format(new Date(at));

/**
 * Tu historia: lo que SOI ha visto contigo, con los años. Capítulos cerrados (y la carta al yo futuro, que se abre
 * al cerrar el año siguiente), "hace un año" y la línea de vida por mes: decisiones, regresos, creencias que se
 * volvieron tuyas, aprendizajes que funcionaron, hábitos que ya te salen solos y logros.
 */
export default async function HistoryPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login?next=/mapa/historia');
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const [events, chapters, chapterState] = await Promise.all([
    loadTimeline(supabase, user.id, tz, profile?.created_at ?? null),
    loadChapters(supabase, user.id),
    loadChapterDue(supabase, user.id, tz),
  ]);
  const months = groupByMonth(events, tz);
  const ago = yearAgo(events);
  const today = todayISO(tz);
  const nextIn = daysUntilNext(chapterState.mapStart, today);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-5 pb-10 pt-4 md:pt-10">
      <header>
        <Link href="/mi-vida?tab=mapa" className="press -ml-1 inline-flex items-center gap-1 text-sm text-soi-muted"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mi mapa</Link>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight">Tu historia</h1>
        <p className="mt-1 text-[15px] text-soi-muted">No es un historial de tareas: son los momentos que te están cambiando. Las pausas también están, porque volver también cuenta.</p>
      </header>

      {chapterState.due ? (
        <Link href="/mapa/capitulo" className="press flex items-center gap-3 rounded-[20px] bg-soi-ink p-4 text-white">
          <Flag className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span className="flex-1 font-medium">{chapterState.due.kind === 'anual' ? 'Es momento de cerrar tu año' : 'Es momento de cerrar tu capítulo de 90 días'}</span>
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </Link>
      ) : nextIn !== null ? (
        <p className="nums rounded-[20px] bg-soi-sidebar p-4 text-[15px] text-soi-muted">Tu vida va en capítulos de {CHAPTER_DAYS} días. El siguiente cierra en {nextIn} {nextIn === 1 ? 'día' : 'días'}.</p>
      ) : (
        <Link href="/mapa/diagnostico" className="press rounded-[20px] bg-soi-sidebar p-4 text-[15px] text-soi-muted">Dibuja tu mapa y tu historia empieza a contarse en capítulos. <span className="text-soi-accent underline underline-offset-4">Hacer mi mapa</span></Link>
      )}

      {ago && (
        <figure className="rounded-[20px] bg-soi-accent-soft p-4">
          <figcaption className="text-xs font-medium text-soi-accent">Hace un año · {KIND_LABEL[ago.kind]}</figcaption>
          <blockquote className="mt-1 text-pretty text-[17px] font-medium leading-snug">{ago.title}</blockquote>
          {ago.detail && <p className="mt-1 text-sm text-soi-muted">{ago.detail}</p>}
        </figure>
      )}

      {chapters.length > 0 && (
        <section aria-labelledby="ch-h">
          <h2 id="ch-h" className="px-1 pb-2 text-xs font-medium text-soi-muted">Tus capítulos</h2>
          <ol className="flex flex-col gap-3">
            {chapters.map((c) => {
              const opensOn = addDays(c.period_end, CHAPTER_DAYS * 4);
              const open = c.letter && opensOn <= today;
              const lines = snapshotLines(c.snapshot ?? {});
              return (
                <li key={c.id} id={`c-${c.id}`} className="scroll-mt-20 rounded-[28px] bg-soi-tray p-2">
                  <div className="rounded-[20px] bg-white p-4 shadow-ring">
                    <p className="text-xs font-medium text-soi-accent">{c.kind === 'anual' ? 'Tu año' : 'Capítulo de 90 días'} · {fmt(c.period_start)} – {fmt(c.period_end)}</p>
                    {c.proud && <p className="mt-2 text-[17px] font-medium leading-snug">{c.proud}</p>}
                    {c.lesson && <p className="mt-2 text-[15px]"><span className="text-soi-muted">Aprendiste de ti:</span> {c.lesson}</p>}
                    {c.letting_go && <p className="mt-1 text-[15px]"><span className="text-soi-muted">Soltaste:</span> {c.letting_go}</p>}
                    {c.next_vision && <p className="mt-1 text-[15px]"><span className="text-soi-muted">Tu visión nueva:</span> {c.next_vision}</p>}
                    {lines.length > 0 && <p className="nums mt-3 text-sm text-soi-muted">{lines.join(' · ')}</p>}
                    {c.letter && (open
                      ? <blockquote className="mt-3 whitespace-pre-line rounded-[14px] bg-soi-accent-soft p-3 text-[15px] leading-relaxed">{c.letter}</blockquote>
                      : <p className="mt-3 flex items-center gap-2 text-sm text-soi-muted"><Lock className="h-4 w-4" aria-hidden="true" /> Tu carta se abre el {fmt(opensOn)}.</p>)}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {months.length > 0 ? (
        <section aria-labelledby="tl-h">
          <h2 id="tl-h" className="px-1 pb-2 text-xs font-medium text-soi-muted">Tu línea de vida</h2>
          <div className="flex flex-col gap-6">
            {months.map((m) => (
              <section key={m.key} aria-label={m.label}>
                <h3 className="px-1 pb-2 text-sm font-semibold first-letter:uppercase">{m.label}</h3>
                <ol className="relative flex flex-col gap-1.5 border-l border-black/10 pl-4">
                  {m.events.map((e, i) => {
                    const body = (
                      <>
                        <span className="nums block text-xs text-soi-muted">{fmtAt(e.at, tz)} · {KIND_LABEL[e.kind]}</span>
                        <span className="mt-0.5 block text-[15px] leading-snug">{e.title}</span>
                        {e.detail && <span className="mt-0.5 block text-sm text-soi-muted">{e.detail}</span>}
                      </>
                    );
                    return (
                      <li key={`${e.kind}-${e.at}-${i}`} className="relative">
                        <span aria-hidden="true" className="absolute -left-[21px] top-3 h-2 w-2 rounded-full bg-soi-accent" />
                        {e.href ? <Link href={e.href} className="press block rounded-[14px] bg-white px-3 py-2.5 shadow-ring">{body}</Link>
                          : <div className="rounded-[14px] bg-white px-3 py-2.5 shadow-ring">{body}</div>}
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        </section>
      ) : (
        <p className="rounded-[20px] bg-soi-sidebar p-4 text-[15px] text-soi-muted">Tu historia empieza con tu primer Moment. Cada decisión, regreso y logro irá quedando aquí.</p>
      )}
    </div>
  );
}
