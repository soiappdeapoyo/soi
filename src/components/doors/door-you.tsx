import Link from 'next/link';
import { ArrowRight, Layers, Settings, X } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DOOR_IDS, DOORS, doorsOf, type DoorProfile } from '@/config/doors';
import { effectivePlan, trialDaysLeft, type AccessProfile } from '@/lib/billing/access-rules';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { DoorAction } from './door-action';
import { DoorPicker } from './door-picker';

type Profile = DoorProfile & AccessProfile & { display_name?: string | null; avatar_url?: string | null; streak_current?: number | null };

/**
 * Tú en la app enfocada: lo que llevas (sin puntajes), tus puertas (sumar otra: la memoria es la misma), tu plan,
 * Ajustes y «Ver SOI completo» (misma cuenta, abre SOI Full).
 */
export async function DoorYou({ supabase, userId, profile }: { supabase: SupabaseClient; userId: string; profile: Profile | null }) {
  const mine = doorsOf(profile);
  const main = mine[0];
  if (!main) {
    return <div className="mx-auto max-w-xl px-4 py-6"><DoorPicker /></div>;
  }
  const others = DOOR_IDS.filter((id) => !mine.some((d) => d.id === id)).map((id) => DOORS[id]);
  const { count: lived } = await supabase.from('moment_runs').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('completed_at', 'is', null);
  const plan = profile ? effectivePlan(profile) : 'free';
  const days = profile ? trialDaysLeft(profile) : 0;
  const streak = profile?.streak_current ?? 0;
  const name = profile?.display_name ?? 'Tú';

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-6">
      <header className="flex items-center gap-3">
        {profile?.avatar_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          : <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full text-xl font-medium" style={{ background: main.soft, color: main.accent }}>{name.charAt(0).toUpperCase()}</span>}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="text-sm" style={{ color: main.accent }}>{main.app}</p>
        </div>
      </header>

      <section aria-label="Lo que llevas" className="grid grid-cols-2 gap-2.5">
        <div className="rounded-[20px] bg-soi-sidebar p-4">
          <p className="nums text-2xl font-semibold">{lived ?? 0}</p>
          <p className="text-sm text-soi-muted">{lived === 1 ? 'práctica vivida' : 'prácticas vividas'}</p>
        </div>
        <div className="rounded-[20px] bg-soi-sidebar p-4">
          <p className="nums text-2xl font-semibold">{streak}</p>
          <p className="text-sm text-soi-muted">{streak === 1 ? 'día seguido' : 'días seguidos'} · sin castigo si fallas uno</p>
        </div>
      </section>

      <section aria-labelledby="tus-puertas">
        <h2 id="tus-puertas" className="mb-2 text-lg font-semibold">Lo que estás trabajando</h2>
        <ul className="flex flex-col gap-2">
          {mine.map((d, i) => (
            <li key={d.id} className="flex items-center gap-3 rounded-[20px] bg-white p-3.5 shadow-ring">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: d.soft, color: d.accent }}><Icon name={d.icon} className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{d.label}</span>
                <span className="block text-sm text-soi-muted">{i === 0 ? 'Tu puerta principal' : 'También lo trabajas'}</span>
              </span>
              {i > 0 && (
                <DoorAction body={{ action: 'remove', door: d.id }} ariaLabel={`Quitar ${d.label}`} className="press flex h-11 w-11 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
                  <X className="h-4 w-4" aria-hidden="true" />
                </DoorAction>
              )}
            </li>
          ))}
        </ul>
        {others.length > 0 && (
          <>
            <p className="mb-2 mt-4 text-sm text-soi-muted">¿También te pasa? Súmalo: SOI ya te conoce.</p>
            <div className="flex flex-wrap gap-2">
              {others.map((d) => (
                <DoorAction key={d.id} body={{ action: 'add', door: d.id }} className="press inline-flex h-11 items-center gap-2 rounded-full bg-white px-4 text-sm shadow-ring hover:shadow-soft">
                  <Icon name={d.icon} className="h-4 w-4" /> {d.label}
                </DoorAction>
              ))}
            </div>
          </>
        )}
      </section>

      <section aria-label="Tu plan" className="rounded-[20px] bg-soi-sidebar p-4">
        <p className="font-medium">{plan === 'soi_plus' ? 'Tienes SOI+' : plan === 'trial' ? `Tu prueba: ${days} ${days === 1 ? 'día' : 'días'} más` : 'Plan Free'}</p>
        <p className="mt-0.5 text-sm text-soi-muted">
          {plan === 'soi_plus' ? 'Todo abierto. Cancelas desde Ajustes con un toque.' : plan === 'trial' ? 'Todo abierto, sin tarjeta. Lo tuyo nunca se borra.' : 'Puedes seguir hablando con SOI. Con SOI+ vuelven tus prácticas y la voz.'}
        </p>
        {plan !== 'soi_plus' && <Link href="/planes" className={buttonClass('gold', 'md', 'mt-3 w-full')}>Ver SOI+</Link>}
      </section>

      <nav aria-label="Más" className="flex flex-col">
        <Link href="/ajustes" className="press flex min-h-12 items-center gap-3 rounded-lg px-2 hover:bg-black/[0.04]">
          <Settings className="h-5 w-5 text-soi-muted" aria-hidden="true" /><span className="flex-1">Ajustes: avisos, voz y cuenta</span><ArrowRight className="h-4 w-4 text-soi-muted" aria-hidden="true" />
        </Link>
        <DoorAction body={{ action: 'mode', mode: 'full' }} to="/hoy" className="press flex min-h-12 w-full items-center gap-3 rounded-lg px-2 text-left hover:bg-black/[0.04]">
          <Layers className="h-5 w-5 text-soi-muted" aria-hidden="true" />
          <span className="flex-1">Ver SOI completo<span className="block text-sm text-soi-muted">Tu mapa, Mi Nuevo Yo, Batallas y más. Puedes volver cuando quieras.</span></span>
          <ArrowRight className="h-4 w-4 text-soi-muted" aria-hidden="true" />
        </DoorAction>
      </nav>
    </div>
  );
}
