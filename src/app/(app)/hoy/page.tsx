import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { loadToday } from '@/lib/today';
import { greetingForHour } from '@/lib/opener';
import { CheckinChips } from '@/components/today/checkin-chips';
import { TodayVideo } from '@/components/today/today-video';
import { BreathingCard } from '@/components/today/breathing-card';
import { ActionCardView } from '@/components/chat/action-card-view';
import { SoiPlayer } from '@/components/media/soi-player';
import { MomentumCard } from '@/components/momentum/momentum-card';
import { buttonClass } from '@/components/ui/button';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import { recommendMoment } from '@/lib/moments/server';
import { MODE_KINDS } from '@/lib/moments/recommend';

export const metadata: Metadata = { title: 'Hoy' };

function hourIn(timeZone: string) {
  try {
    return Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(new Date()));
  } catch {
    return new Date().getHours();
  }
}

const MODE_LABEL = {
  REGULATE: 'Regular', REFLECT: 'Reflexionar', CLARIFY: 'Aclarar', CONTINUE: 'Continuar', EXECUTE: 'Ejecutar', INSPIRE: 'Inspirarte',
} as const;

/**
 * Hoy: la IA decide qué necesitas ahora — ejecutar, inspirarte, reflexionar o continuar.
 * Una sola tarjeta principal (la intervención) y un acceso directo a SOI. Nada de listas infinitas.
 */
export default async function HoyPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { profile, access } = await getAccessMap(user.id);
  const today = await loadToday(supabase, user.id, profile, access.daily_ritual);
  const { decision } = today;
  const moment = decision.mode === 'REFLECT' ? null : await recommendMoment(supabase, user.id, MODE_KINDS[decision.mode]);
  const first = (profile?.display_name ?? '').trim().split(/\s+/)[0];
  const tz = profile?.timezone ?? 'America/Mexico_City';

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-5 py-6 md:py-10">
      <header>
        <p className="text-sm text-soi-muted">{greetingForHour(hourIn(tz))}{first ? `, ${first}` : ''}</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">{decision.headline}</h1>
        <p className="mt-1 text-[15px] text-soi-muted">{decision.detail}</p>
      </header>

      <section aria-label="¿Cómo llegas hoy?">
        <p className="mb-2 text-xs font-medium text-soi-muted">¿Cómo llegas hoy?</p>
        <CheckinChips current={today.checkin} />
      </section>

      <section aria-labelledby="now" className="rounded-[20px] bg-soi-sidebar p-3">
        <p id="now" className="px-1 pb-2 text-xs font-medium text-soi-muted">Ahora · {MODE_LABEL[decision.mode]}</p>
        <div className="rounded-lg bg-white p-4 shadow-ring">
          {decision.mode === 'REGULATE' && (
            <>
              <BreathingCard />
              {moment && (
                <div className="mt-4 flex flex-col gap-2 border-t border-black/[0.06] pt-4">
                  <p className="text-sm text-soi-muted">Cuando quieras ir un poco más allá:</p>
                  <MomentFlowCard m={moment} href={`/m/${moment.id}`} />
                </div>
              )}
            </>
          )}

          {decision.mode === 'REFLECT' && today.unreflectedVideo && (
            <SoiPlayer startWithReflection video={{ ...today.unreflectedVideo, thumbnail: '' }} />
          )}

          {decision.mode !== 'REGULATE' && decision.mode !== 'REFLECT' && (
            moment ? (
              <div className="-m-1 flex flex-col gap-3">
                {decision.mode === 'INSPIRE' && <TodayVideo state={decision.state} />}
                <MomentFlowCard m={moment} href={`/m/${moment.id}`} />
                <Link href={`/m/${moment.id}/play`} className={buttonClass('primary', 'lg')}>Comenzar</Link>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-3">
                {decision.mode === 'INSPIRE' && <TodayVideo state={decision.state} />}
                <p className="text-[15px]">Cuéntale a SOI cómo estás y diseñará un Moment para este momento.</p>
                <Link href="/chat" className={buttonClass('primary', 'sm')}>Hablar con SOI</Link>
              </div>
            )
          )}
        </div>
      </section>

      {today.pending.length > 0 && (
        <section aria-labelledby="pend" className="rounded-[20px] bg-soi-sidebar p-3">
          <p id="pend" className="px-1 text-xs font-medium text-soi-muted">Próximos pasos pendientes</p>
          <ul className="-mt-1">
            {today.pending.map((a) => (
              <li key={a.id}><ActionCardView card={{ id: a.id, title: a.title, minutes: a.minutes, detail: null, category: a.area, done: false }} /></li>
            ))}
          </ul>
        </section>
      )}

      <Link href="/chat" className="press flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soi-ink text-white"><MessageCircle className="h-5 w-5" aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Hablar con SOI</span>
          <span className="block text-sm text-soi-muted">Construye tu sistema conversando</span>
        </span>
        <ArrowRight className="h-4 w-4 text-soi-subtle" aria-hidden="true" />
      </Link>

      <MomentumCard m={today.momentum} />
    </div>
  );
}
