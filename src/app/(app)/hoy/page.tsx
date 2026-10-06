import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Check, ListPlus, Play } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { loadToday } from '@/lib/today';
import { greetingForHour } from '@/lib/opener';
import { loadDayPlan, playHref } from '@/lib/day-plan';
import { CheckinChips } from '@/components/today/checkin-chips';
import { BreathingCard } from '@/components/today/breathing-card';
import { PlayLink } from '@/components/today/play-link';
import { ActionCardView } from '@/components/chat/action-card-view';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { ACTIONS } from '@/config/actions';
import { recommendMoment } from '@/lib/moments/server';
import { MODE_KINDS } from '@/lib/moments/recommend';
import type { MomentFlow } from '@/lib/moments/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Hoy' };

/** Íconos de los primeros bloques (sin repetir): se entiende el Moment de un vistazo. */
function BlockIcons({ m }: { m: MomentFlow }) {
  const types = [...new Set(m.blocks.map((b) => b.type))].filter((t) => t in ACTIONS).slice(0, 5);
  if (!types.length) return null;
  return (
    <span className="flex items-center gap-1.5 text-soi-muted" aria-hidden="true">
      {types.map((t) => <Icon key={t} name={ACTIONS[t].icon} className="h-3.5 w-3.5" />)}
    </span>
  );
}

/**
 * Hoy = tu lista de reproducción. Los Moments que elegiste en Mi Vida › Mi día, en orden: un toque en
 * Reproducir y cada uno pasa solo al siguiente. Sin plan, SOI propone uno según cómo llegas.
 */
export default async function HoyPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { profile, access } = await getAccessMap(user.id);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const [today, plan] = await Promise.all([
    loadToday(supabase, user.id, profile, access.daily_ritual),
    loadDayPlan(supabase, user.id, tz),
  ]);
  const { decision } = today;
  const items = plan.items;
  const pending = items.filter((i) => !i.done);
  const next = items.find((i) => i.id === plan.next && !i.done) ?? pending[0] ?? null;
  const left = pending.reduce((a, i) => a + (i.moment?.required_minutes ?? 0), 0);
  // Sin plan (o ya vivido), una sola propuesta según el estado.
  const suggestion = !next && decision.mode !== 'REFLECT' ? await recommendMoment(supabase, user.id, MODE_KINDS[decision.mode]) : null;
  const first = (profile?.display_name ?? '').trim().split(/\s+/)[0];

  const headline = next
    ? pending.length === items.length ? 'Tu día está listo' : `Te ${pending.length === 1 ? 'queda 1 Moment' : `quedan ${pending.length} Moments`}`
    : items.length ? 'Viviste tu día' : decision.headline;
  const detail = next
    ? `${left} min en total. Dale play y SOI te guía de uno en uno.`
    : items.length ? 'Todo lo que planeaste, lo hiciste. Descansa: eso también cuenta.' : decision.detail;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-6 md:py-10">
      <header>
        <p className="text-sm text-soi-muted">{greetingForHour(plan.hour)}{first ? `, ${first}` : ''}</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">{headline}</h1>
        <p className="mt-1 text-[15px] text-soi-muted">{detail}</p>
      </header>

      {decision.mode === 'REGULATE' && (
        <section aria-label="Antes de empezar" className="rounded-[20px] bg-soi-sidebar p-3">
          <p className="px-1 pb-2 text-xs font-medium text-soi-muted">Antes de empezar, un minuto para ti</p>
          <div className="rounded-lg bg-white p-4 shadow-ring"><BreathingCard /></div>
        </section>
      )}

      {/* Lo que sigue: un solo botón grande. */}
      {next?.moment ? (
        <section aria-labelledby="next" className="relative isolate overflow-hidden rounded-[20px] bg-soi-ink p-5 text-white">
          {/* La portada es la protagonista de Hoy: de fondo, con degradado para que el texto se lea. */}
          {next.moment.cover && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={next.moment.cover} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover" />
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
            </>
          )}
          <p id="next" className={cn('text-xs font-medium text-white/60', next.moment.cover && 'pt-16 text-white/80')}>{next.time ? `A continuación · ${next.time}` : 'A continuación'}</p>
          <p className="mt-1 text-balance text-[22px] font-semibold leading-snug">{next.moment.title}</p>
          <p className="nums mt-1 text-sm text-white/70">{next.moment.required_minutes} min · {next.moment.blocks.length} {next.moment.blocks.length === 1 ? 'paso' : 'pasos'}</p>
          <PlayLink href={playHref(next.moment, true)} prefetch label={`Reproducir ${next.moment.title}`}
            className="press tap-target mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-white py-3.5 text-[17px] font-semibold text-soi-ink">
            <Play className="h-5 w-5 fill-current" aria-hidden="true" /> {pending.length === items.length ? 'Reproducir mi día' : 'Continuar'}
          </PlayLink>
        </section>
      ) : suggestion ? (
        <section aria-labelledby="sug" className="relative isolate overflow-hidden rounded-[20px] bg-soi-ink p-5 text-white">
          {suggestion.cover && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={suggestion.cover} alt="" aria-hidden="true" className="absolute inset-0 -z-10 h-full w-full object-cover" />
              <span aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/15" />
            </>
          )}
          <p id="sug" className={cn('text-xs font-medium text-white/60', suggestion.cover && 'pt-16 text-white/80')}>SOI te propone</p>
          <p className="mt-1 text-balance text-[22px] font-semibold leading-snug">{suggestion.title}</p>
          <p className="nums mt-1 text-sm text-white/70">{suggestion.required_minutes} min</p>
          <PlayLink href={`/m/${suggestion.official ? suggestion.slug : suggestion.id}/play`} prefetch label={`Empezar ${suggestion.title}`}
            className="press tap-target mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-white py-3.5 text-[17px] font-semibold text-soi-ink">
            <Play className="h-5 w-5 fill-current" aria-hidden="true" /> Empezar
          </PlayLink>
        </section>
      ) : null}

      {/* La lista (como una playlist): tocar cualquiera la reproduce desde ahí. */}
      {items.length > 0 ? (
        <section aria-labelledby="queue">
          <div className="flex items-baseline justify-between px-1 pb-2">
            <h2 id="queue" className="text-xs font-medium text-soi-muted">Tu día · <span className="nums">{items.length - pending.length} de {items.length}</span></h2>
            <Link href="/mi-vida?tab=dia" className="press text-sm text-soi-accent">Editar</Link>
          </div>
          <ol className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
            {items.map((i, n) => i.moment && (
              <li key={i.id}>
                <PlayLink href={playHref(i.moment, true)} label={`${i.done ? 'Repetir' : 'Reproducir desde'} ${i.moment.title}`}
                  className={cn('press flex w-full items-center gap-3 rounded-[14px] bg-white px-3 py-3 text-left shadow-ring', i.done && 'bg-white/60 shadow-none')}>
                  {i.moment.cover ? (
                    // Miniatura con el estado encima (hecho / sigue).
                    <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.moment.cover} alt="" className={cn('h-full w-full object-cover', i.done && 'opacity-50')} />
                      {(i.done || i.id === next?.id) && (
                        <span className={cn('absolute inset-0 flex items-center justify-center', i.done ? 'bg-soi-accent/40 text-white' : 'bg-black/35 text-white')} aria-hidden="true">
                          {i.done ? <Check className="h-4 w-4" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className={cn('nums flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs', i.done ? 'bg-soi-accent-soft text-soi-accent' : i.id === next?.id ? 'bg-soi-ink text-white' : 'bg-soi-tray text-soi-muted')}>
                      {i.done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : i.id === next?.id ? <Play className="h-3 w-3 fill-current" aria-hidden="true" /> : n + 1}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-[15px]', i.done ? 'text-soi-muted line-through decoration-black/20' : 'font-medium')}>{i.moment.title}</span>
                    <span className="nums flex items-center gap-2 text-xs text-soi-muted">{i.time ? `${i.time} · ` : ''}{i.moment.required_minutes} min <BlockIcons m={i.moment} /></span>
                  </span>
                </PlayLink>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        <Link href="/mi-vida?tab=dia" className="press flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soi-accent-soft text-soi-accent"><ListPlus className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Arma tu día</span>
            <span className="block text-sm text-soi-muted">Elige tus Moments una vez; aquí se reproducen solos.</span>
          </span>
        </Link>
      )}

      <section aria-label="¿Cómo llegas hoy?">
        <p className="mb-2 px-1 text-xs font-medium text-soi-muted">¿Cómo llegas hoy?</p>
        <CheckinChips current={today.checkin} />
      </section>

      {today.pending.length > 0 && (
        <details className="group rounded-[20px] bg-soi-sidebar p-3">
          <summary className="press cursor-pointer list-none px-1 text-sm text-soi-muted">
            <span className="nums">{today.pending.length}</span> {today.pending.length === 1 ? 'paso por retomar' : 'pasos por retomar'}
          </summary>
          <ul className="mt-1">
            {today.pending.map((a) => (
              <li key={a.id}><ActionCardView card={{ id: a.id, title: a.title, minutes: a.minutes, detail: null, category: a.area, done: false }} /></li>
            ))}
          </ul>
        </details>
      )}

      <Link href="/chat" className={buttonClass('ghost', 'md', 'self-center text-soi-muted')}>¿Algo en mente? Cuéntaselo a SOI</Link>
    </div>
  );
}
