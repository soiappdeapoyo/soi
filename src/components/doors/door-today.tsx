import Link from 'next/link';
import { ArrowRight, MessageCircle, Moon, Play, Plus } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { activeDoor, type DoorProfile } from '@/config/doors';
import { officialMoment } from '@/config/official-moments';
import { loadDayPlan, playHref } from '@/lib/day-plan';
import { greetingForHour } from '@/lib/opener';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { PlayLink } from '@/components/today/play-link';
import { ReturnSetup } from '@/components/pwa/return-setup';
import { DoorPicker } from './door-picker';

type Profile = DoorProfile & {
  display_name?: string | null; timezone?: string | null; streak_current?: number | null;
  push_subscription?: unknown; reminder_time?: string | null;
};

/**
 * Hoy en la app enfocada: UNA práctica (la siguiente de su día o diseñarla con SOI), el botón de un toque para el
 * momento difícil, la práctica de la noche desde las 18:00 y, desde su primer Moment, instalar + avisos (el coach
 * le escribe en la mañana y en la noche). Nada más compite.
 */
export async function DoorToday({ supabase, userId, profile }: { supabase: SupabaseClient; userId: string; profile: Profile | null }) {
  const door = activeDoor(profile);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const name = (profile?.display_name ?? '').trim().split(/\s+/)[0] ?? '';

  if (!door) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{name ? `Hola, ${name}` : 'Hola'}</h1>
          <p className="mt-1 text-soi-muted">Elige por dónde empezar. Después puedes sumar otra.</p>
        </header>
        <DoorPicker />
      </div>
    );
  }

  const [plan, { count: completed }] = await Promise.all([
    loadDayPlan(supabase, userId, tz),
    supabase.from('moment_runs').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('completed_at', 'is', null),
  ]);
  const next = plan.items.find((i) => i.id === plan.next) ?? plan.items.find((i) => !i.done) ?? null;
  const doneToday = plan.items.filter((i) => i.done).length;
  const night = plan.hour >= 18 || plan.hour < 4 ? officialMoment(door.night.slug) : null;
  const streak = profile?.streak_current ?? 0;
  const tint = { background: door.soft, color: door.accent };

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-6">
      <header>
        <p className="text-sm font-medium" style={{ color: door.accent }}>{door.app}</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">{greetingForHour(plan.hour)}{name ? `, ${name}` : ''}</h1>
        {streak > 1 && <p className="nums mt-1 text-sm text-soi-muted">Llevas {streak} días cuidándote.</p>}
      </header>

      {/* Lo principal del día: lo siguiente de su día o diseñarlo con SOI. */}
      {next?.moment ? (
        <section className="rounded-[24px] p-5" style={{ background: door.soft }} aria-label="Tu práctica de hoy">
          <p className="text-sm font-medium" style={{ color: door.accent }}>Tu práctica de hoy</p>
          <p className="mt-1 text-xl font-semibold leading-snug">{next.moment.title}</p>
          <p className="nums mt-1 text-sm text-soi-muted">
            {next.moment.required_minutes} min{next.time ? ` · a las ${next.time}` : ''}{next.partial ? ` · vas en ${next.partial} %` : ''}
          </p>
          <PlayLink href={playHref(next.moment, true)} prefetch className={buttonClass('primary', 'lg', 'mt-4 w-full')}>
            <Play className="h-5 w-5" aria-hidden="true" /> {next.partial ? 'Seguir donde lo dejé' : 'Empezar'}
          </PlayLink>
        </section>
      ) : (
        <section className="rounded-[24px] p-5" style={{ background: door.soft }} aria-label="Tu práctica de hoy">
          <p className="text-sm font-medium" style={{ color: door.accent }}>{doneToday ? 'Ya viviste tu práctica de hoy' : 'Tu práctica de hoy'}</p>
          <p className="mt-1 text-[17px] leading-snug">
            {doneToday ? '¿Quieres otra para este momento? SOI la diseña con lo que le cuentes.' : `${door.promise} SOI la diseña contigo en un par de minutos.`}
          </p>
          <Link href={`/chat?nueva=1&rutina=${door.practice.situation}`} className={buttonClass('primary', 'lg', 'mt-4 w-full')}>
            <Plus className="h-5 w-5" aria-hidden="true" /> {door.practice.label}
          </Link>
        </section>
      )}

      {/* El momento difícil, a un toque. */}
      <Link href={`/chat?nueva=1&rutina=${door.sos.situation}`} className="press flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={tint}><Icon name={door.icon} className="h-5 w-5" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{door.sos.label}</span>
          <span className="block text-sm text-soi-muted">Un par de minutos con SOI, ahora mismo.</span>
        </span>
        <ArrowRight className="h-5 w-5 shrink-0" style={{ color: door.accent }} aria-hidden="true" />
      </Link>

      {night && (
        <Link href={`/m/${night.slug}/play`} className="press flex items-center gap-3 rounded-[20px] bg-soi-ink p-4 text-white">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"><Moon className="h-5 w-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{door.night.label}</span>
            <span className="nums block text-sm text-white/70">{night.title} · {night.required_minutes} min</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      )}

      {/* Lo demás de su día, discreto. */}
      {plan.items.filter((i) => i !== next).length > 0 && (
        <section aria-label="Lo demás de tu día" className="rounded-[20px] bg-soi-sidebar p-3">
          <p className="px-1 pb-1 text-xs font-medium text-soi-muted">También en tu día</p>
          <ul>
            {plan.items.filter((i) => i !== next).map((i) => i.moment && (
              <li key={i.id}>
                <Link href={playHref(i.moment)} className="press flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 hover:bg-black/[0.04]">
                  <span className="min-w-0 truncate">{i.moment.title}</span>
                  <span className="nums shrink-0 text-sm text-soi-muted">{i.done ? 'Hecho' : `${i.moment.required_minutes} min`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Instalar y avisos (el coach le escribe en la mañana y en la noche): desde su primer Moment. */}
      {(completed ?? 0) > 0 && (
        <ReturnSetup pushOn={Boolean(profile?.push_subscription)} reminderTime={profile?.reminder_time ?? null} where="puerta" name={profile?.display_name ?? null} />
      )}

      <Link href="/chat?nueva=1" className={buttonClass('ghost', 'md', 'self-center text-soi-muted')}>
        <MessageCircle className="h-4 w-4" aria-hidden="true" /> ¿Algo en mente? Cuéntaselo a SOI
      </Link>
    </div>
  );
}
