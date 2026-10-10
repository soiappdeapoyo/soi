import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, BadgeCheck, GitBranch, Lock } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getMoment, fullBlocks, getEnrollment, officialCounts } from '@/lib/moments/server';
import { challengeLength, challengeState } from '@/lib/moments/challenge';
import { getProfile } from '@/lib/billing/check-access';
import { cn, todayISO } from '@/lib/utils';
import { creatorsById } from '@/lib/social/queries';
import { ACTIONS, MOMENT_KINDS, blockSeconds } from '@/config/actions';
import { officialMoment } from '@/config/official-moments';
import { Icon } from '@/components/ui/icon';
import { MomentActions } from '@/components/moments/moment-actions';

export const metadata: Metadata = { title: 'Moment' };

function fmt(s: number) {
  return s < 60 ? `${s} s` : `${Math.round(s / 60)} min`;
}

/** Detalle de un SOI Moment: intención, objetivo, la secuencia de acciones y cómo se ha usado. */
export default async function MomentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ compra?: string }> }) {
  const [{ id }, { compra }] = await Promise.all([params, searchParams]);
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/login?next=/m/${id}`);
  const m = await getMoment(supabase, id);
  if (!m) notFound();

  const own = m.creator_id === user.id;
  const [full, creators, { data: purchase }, { data: creatorProfile }, { data: parent }] = await Promise.all([
    fullBlocks(supabase, m),
    creatorsById(supabase, m.creator_id ? [m.creator_id] : []),
    m.tier === 'premium' && !own
      ? supabase.from('blueprint_purchases').select('id').eq('blueprint_id', m.id).eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('creator_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
    m.parent_id ? supabase.from('soi_blueprints').select('id, title').eq('id', m.parent_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const creator = m.creator_id ? creators.get(m.creator_id) : undefined;
  const isChallenge = m.kind === 'challenge';
  const [enrollment, profile] = isChallenge ? await Promise.all([getEnrollment(supabase, user.id, m), getProfile(user.id)]) : [null, null];
  const blocks = full ?? m.blocks;
  const totalDays = isChallenge ? challengeLength(blocks, m.duration_days) : 0;
  const st = isChallenge ? challengeState(enrollment?.completed ?? {}, totalDays, todayISO(profile?.timezone ?? undefined)) : null;
  const startLabel = !st ? undefined : !enrollment || enrollment.status === 'left' ? 'Unirme al reto' : st.finished ? 'Repasar el reto' : st.availableToday ? `Hacer el día ${st.currentDay}` : 'Ver mi progreso';
  const preview = !full;
  const parentTitle = (parent as { title?: string } | null)?.title ?? (m.parent_slug ? officialMoment(m.parent_slug)?.title : null);
  const parentHref = m.parent_id ? `/m/${m.parent_id}` : m.parent_slug ? `/m/${m.parent_slug}` : null;

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:py-8">
      <Link href="/impulso" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Impulso</Link>
      {compra === 'ok' && !purchase && <p role="status" className="mt-4 rounded-[14px] bg-soi-accent-soft p-3 text-sm text-soi-accent">Estamos confirmando tu pago. Recarga en unos segundos.</p>}

      <header className={cn('relative mt-5', m.cover && 'overflow-hidden rounded-[24px] bg-soi-ink px-5 pb-6 pt-28 text-white shadow-soft')}>
        {m.cover && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={m.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" aria-hidden="true" />
          </>
        )}
        <div className="relative">
          <p className={cn('flex flex-wrap items-center gap-2 text-xs', m.cover ? 'text-white/85' : 'text-soi-muted')}>
            <span className={cn('rounded-md px-1.5 py-0.5 font-medium', m.cover ? 'bg-white/20 text-white backdrop-blur' : 'bg-soi-accent-soft text-soi-accent')}>{MOMENT_KINDS[m.kind].label}</span>
            <span className="nums">{isChallenge ? `${m.required_minutes} min al día · ${totalDays} días` : `${m.required_minutes} min · ${blocks.length} acciones`}</span>
            {!m.official && m.version > 1 && <span className="nums">· versión {m.version}</span>}
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight [text-wrap:balance]">{m.title}</h1>
          <p className={cn('mt-2 text-sm', m.cover ? 'text-white/85' : 'text-soi-muted')}>
            {m.official ? <>Oficial de SOI · {m.author}</> : creator
              ? <>por <Link href={`/c/${creator.handle}`} className={cn('font-medium underline-offset-4 hover:underline', m.cover ? 'text-white' : 'text-soi-ink')}>{creator.display_name}</Link>{creator.is_verified && <BadgeCheck className={cn('ml-1 inline h-4 w-4 align-[-3px]', m.cover ? 'text-white' : 'text-soi-accent')} aria-label="Creador verificado" />}</>
              : own ? 'Tuyo' : null}
          </p>
          <p className="mt-4 text-[17px] leading-relaxed">{m.objective}</p>
        </div>
      </header>
      {parentTitle && parentHref && (
        <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-soi-muted">
          <GitBranch className="h-4 w-4" aria-hidden="true" /> Tu versión de <Link href={parentHref} className="underline underline-offset-4">{parentTitle}</Link>
        </p>
      )}

      {isChallenge && st && (
        <section aria-labelledby="days" className="mt-6">
          <h2 id="days" className="nums mb-2 text-sm font-medium text-soi-muted">Reto de {totalDays} días · {st.completedCount} completados</h2>
          <ol className="grid grid-cols-7 gap-1.5 rounded-[14px] bg-soi-sidebar p-1.5">
            {Array.from({ length: totalDays }, (_, i) => {
              const d = i + 1;
              const done = Boolean(enrollment?.completed?.[String(d)]);
              const current = st.currentDay === d;
              return (
                <li key={d} aria-label={`Día ${d}${done ? ', completado' : current ? ', el que sigue' : ''}`}
                  className={cn('nums flex aspect-square items-center justify-center rounded-lg text-xs', done ? 'bg-soi-accent text-white' : current ? 'bg-white text-soi-ink shadow-[0_0_0_1.5px_var(--color-soi-accent)]' : 'bg-white/60 text-soi-subtle shadow-ring')}>
                  {d}
                </li>
              );
            })}
          </ol>
          {enrollment && !st.availableToday && !st.finished && <p className="mt-2 text-sm text-soi-muted">Hoy ya practicaste. Mañana sigue el día {st.currentDay}.</p>}
        </section>
      )}

      <section aria-labelledby="flow" className="mt-6">
        <h2 id="flow" className="mb-2 text-sm font-medium text-soi-muted">El flujo</h2>
        <ol className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
          {blocks.map((b, i) => (
            <li key={`${b.id}-${i}`} className="flex items-start gap-3 rounded-[14px] bg-white p-3 shadow-ring">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soi-accent-soft text-soi-accent">
                <Icon name={ACTIONS[b.type]?.icon ?? 'Sparkles'} className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px]">{isChallenge && <span className="nums mr-1.5 text-xs text-soi-accent">{b.day ? `Día ${b.day}` : 'Cada día'}</span>}{b.title}</span>
                <span className="block text-xs text-soi-muted">{ACTIONS[b.type]?.label}{b.source ? ` · ${b.source}` : ''}</span>
              </span>
              <span className="nums shrink-0 text-xs text-soi-muted">{fmt(blockSeconds(b))}</span>
            </li>
          ))}
        </ol>
        {preview && <p className="mt-2 flex items-center gap-1.5 text-xs text-soi-muted"><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Vista previa: el contenido completo se desbloquea al obtenerlo.</p>}
        <p className="mt-2 text-xs text-soi-muted">Fuente: {m.source}</p>
      </section>

      {m.official ? (
        <p className="nums mt-4 text-sm text-soi-muted">{(await officialCounts(supabase)).get(m.slug!)?.toLocaleString('es') ?? 0} ejecuciones en SOI</p>
      ) : m.status === 'published' && (
        <p className="nums mt-4 text-sm text-soi-muted">
          {m.executions_count.toLocaleString('es')} {m.executions_count === 1 ? 'ejecución' : 'ejecuciones'} · {m.forks_count} {m.forks_count === 1 ? 'versión personal' : 'versiones personales'}
        </p>
      )}

      <div className="mt-6">
        <MomentActions
          id={m.id}
          own={own}
          status={m.status}
          canPublish={Boolean(creatorProfile)}
          premium={m.tier === 'premium' ? { priceCents: m.price_cents, currency: m.currency, purchased: Boolean(purchase) } : null}
          startLabel={startLabel}
        />
      </div>
    </div>
  );
}
