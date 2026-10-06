import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Check, Shield, Swords } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { enemyById } from '@/config/enemies';
import { intensityLabel, loadBattles } from '@/lib/battles';
import { MarkAppeared, PrepareCounter, DeleteEvent } from '@/components/battles/battle-actions';

export const metadata: Metadata = { title: 'Batalla' };

/** Un enemigo interior: cómo gana terreno, qué lo vence, el Moment para combatirlo y tu historial con él. */
export default async function EnemyPage({ params }: { params: Promise<{ enemy: string }> }) {
  const { enemy: id } = await params;
  const enemy = enemyById(id);
  if (!enemy) notFound();
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const b = await loadBattles(supabase, user.id, profile, tz);
  const s = b.enemies.find((e) => e.enemy.id === id)!;
  const minutes = enemy.counter.blocks.reduce((a, x) => a + x.minutes, 0);
  const fmt = (iso: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date(iso));
  const allyLevel = new Map(b.allies.map((a) => [a.name, a.level.level]));

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:py-8">
      <Link href="/mi-vida?tab=batallas" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Batallas</Link>
      <p className="mt-5 text-xs font-medium uppercase tracking-wide text-soi-muted">Enemigo interior</p>
      <h1 className="text-3xl font-semibold tracking-tight">{enemy.name}</h1>
      <p className="mt-1 text-lg italic text-soi-muted">«{enemy.whisper}»</p>
      <p className="mt-2 text-[15px]">{enemy.description}</p>

      <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-[14px] bg-soi-sidebar p-1.5 text-center">
        {[{ k: 'Intensidad', v: intensityLabel(s.intensity) }, { k: 'Apareció (30 días)', v: String(s.appearances30) }, { k: 'Lo venciste', v: String(s.victories30) }].map((x) => (
          <div key={x.k} className="rounded-lg bg-white px-2 py-2.5 shadow-ring"><p className="nums text-lg font-semibold">{x.v}</p><p className="text-[11px] text-soi-muted">{x.k}</p></div>
        ))}
      </div>
      {s.pattern && <p className="mt-2 text-sm text-soi-muted">SOI detectó un patrón: {s.pattern}</p>}

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[20px] bg-white p-4 shadow-ring">
          <h2 className="flex items-center gap-1.5 text-sm font-medium"><Swords className="h-4 w-4 text-soi-danger" aria-hidden="true" /> Cómo gana terreno</h2>
          <ul className="mt-2 space-y-1 text-sm text-soi-muted">{enemy.strengths.map((x) => <li key={x}>• {x}</li>)}</ul>
        </div>
        <div className="rounded-[20px] bg-white p-4 shadow-ring">
          <h2 className="flex items-center gap-1.5 text-sm font-medium"><Shield className="h-4 w-4 text-soi-accent" aria-hidden="true" /> Lo que lo vence</h2>
          <ul className="mt-2 space-y-1 text-sm text-soi-muted">{enemy.tactics.map((x) => <li key={x}>• {x}</li>)}</ul>
          <p className="mt-3 text-xs text-soi-muted">Tus aliados: {enemy.allies.map((a) => `${a}${allyLevel.get(a) ? ` (nivel ${allyLevel.get(a)})` : ''}`).join(' · ')}</p>
        </div>
      </section>

      <section className="mt-4 rounded-[20px] bg-soi-accent-soft p-4">
        <p className="text-xs font-medium text-soi-accent">SOI recomienda</p>
        <p className="mt-1 text-lg font-medium">{enemy.counter.title}</p>
        <p className="nums text-sm text-soi-muted">{minutes} minutos · {enemy.counter.source}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <PrepareCounter enemy={enemy.id} label="Enfrentarlo ahora" />
          <MarkAppeared enemy={enemy.id} name={enemy.name} />
        </div>
      </section>

      <section aria-labelledby="hist" className="mt-8">
        <h2 id="hist" className="mb-2 text-sm font-medium text-soi-muted">Tu historial con {enemy.name}</h2>
        {s.events.length ? (
          <ol className="flex flex-col gap-1.5">
            {s.events.slice(0, 50).map((ev) => (
              <li key={ev.id} className="flex items-start gap-3 rounded-[14px] bg-white p-3 shadow-ring">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-soi-muted">{fmt(ev.occurred_at)}{ev.goal ? ` · ${ev.goal}` : ''}</p>
                  {ev.evidence && <p className="mt-0.5 text-sm italic">«{ev.evidence}»</p>}
                  {ev.defeatedBy
                    ? <p className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-soi-accent"><Check className="h-4 w-4" aria-hidden="true" /> Lo venciste con «{ev.defeatedBy}»</p>
                    : <p className="mt-1 text-sm text-soi-muted">Intentó ganar terreno.</p>}
                </div>
                <DeleteEvent id={ev.id} />
              </li>
            ))}
          </ol>
        ) : <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">No ha aparecido en los últimos 90 días.</p>}
      </section>
    </div>
  );
}
