'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { track } from '@/components/providers/analytics';
import { lifeArea } from '@/config/life-areas';
import type { PlanArea } from '@/lib/life-plan';

const field = 'mt-1.5 w-full rounded-[14px] bg-white px-3 py-2.5 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill';

/**
 * El plan de 90 días: SOI lo propone (o se abre el que ya tiene) y la persona lo ajusta antes de usarlo.
 * Por área: meta, identidad y el hábito clave en 2 minutos con su señal y su hora. Al usarlo, cada hábito
 * queda en Mi día con su alarma.
 */
export function PlanEditor({ initial }: { initial: PlanArea[] | null }) {
  const router = useRouter();
  const [areas, setAreas] = useState<PlanArea[] | null>(initial);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (initial) return;
    let alive = true;
    fetch('/api/life-plan/propose').then((r) => r.json()).then((d) => {
      if (!alive) return;
      if (d?.ok) { setAreas(d.areas); track('plan_proposed', { source: d.source }); } else setFailed(true);
    }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [initial]);

  const set = (i: number, patch: Omit<Partial<PlanArea>, 'habit'> & { habit?: Partial<PlanArea['habit']> }) =>
    setAreas((list) => list && list.map((a, j) => (j === i ? { ...a, ...patch, habit: { ...a.habit, ...(patch.habit ?? {}) } } : a)));

  async function save() {
    if (!areas) return;
    setSaving(true);
    const body = { areas: areas.map((a) => ({ ...a, habit: { ...a.habit, time: a.habit.time || undefined } })) };
    const res = await fetch('/api/life-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!data?.ok) { setSaving(false); toast(data?.message ?? 'No se pudo guardar tu plan.'); return; }
    track('plan_saved', { areas: areas.map((a) => a.area).join(','), edited: Boolean(initial) });
    toast('Tu plan está listo. Tus hábitos ya están en Mi día.');
    router.push('/mi-vida?tab=mapa');
    router.refresh();
  }

  if (failed) {
    return <p className="rounded-[20px] bg-soi-sidebar p-4 text-soi-muted">No pude preparar tu plan ahora. Intenta de nuevo en un momento.</p>;
  }
  if (!areas) {
    return (
      <div aria-busy="true" aria-label="SOI está diseñando tu plan" className="flex flex-col gap-3">
        <p className="text-[15px] text-soi-muted">SOI está diseñando tu plan con lo que contaste…</p>
        {[0, 1].map((k) => <div key={k} className="skeleton h-72 rounded-[28px]" />)}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {areas.map((a, i) => {
        const area = lifeArea(a.area)!;
        return (
          <section key={a.area} aria-labelledby={`plan-${a.area}`} className="rounded-[28px] bg-soi-tray p-2">
            <div className="rounded-[20px] bg-white p-4 shadow-ring">
              <h2 id={`plan-${a.area}`} className="flex items-center gap-2 font-semibold"><Icon name={area.icon} className="h-4 w-4 text-soi-accent" />{area.label}</h2>
              <label className="mt-4 block text-sm font-medium">Tu meta a 90 días
                <textarea rows={2} maxLength={200} value={a.goal} onChange={(e) => set(i, { goal: e.target.value })} className={`${field} resize-none`} />
              </label>
              <label className="mt-3 block text-sm font-medium">Quién eliges ser
                <input maxLength={60} value={a.identity} onChange={(e) => set(i, { identity: e.target.value })} className={field} />
              </label>
              <fieldset className="mt-4 rounded-[14px] bg-soi-sidebar p-3">
                <legend className="px-1 text-sm font-medium">Tu hábito clave</legend>
                <label className="block text-sm text-soi-muted">Nombre
                  <input maxLength={80} value={a.habit.name} onChange={(e) => set(i, { habit: { name: e.target.value } })} className={field} />
                </label>
                <label className="mt-2 block text-sm text-soi-muted">Tu versión de 2 minutos
                  <input maxLength={160} value={a.habit.tiny} onChange={(e) => set(i, { habit: { tiny: e.target.value } })} className={field} />
                </label>
                <div className="mt-2 grid grid-cols-[1fr_7rem] gap-2">
                  <label className="block text-sm text-soi-muted">Tu señal
                    <input maxLength={160} value={a.habit.cue} onChange={(e) => set(i, { habit: { cue: e.target.value } })} placeholder="Después de…" className={field} />
                  </label>
                  <label className="block text-sm text-soi-muted">Hora
                    <input type="time" value={a.habit.time ?? ''} onChange={(e) => set(i, { habit: { time: e.target.value } })} className={`${field} nums`} />
                  </label>
                </div>
              </fieldset>
              {a.milestones.length > 0 && (
                <ol className="mt-4 flex flex-col gap-1.5 text-[15px]">
                  {a.milestones.map((m, k) => (
                    <li key={k} className="flex gap-2"><span className="nums shrink-0 text-sm font-medium text-soi-accent">Mes {k + 1}</span><span className="text-soi-muted">{m.replace(/^Mes \d:\s*/, '')}</span></li>
                  ))}
                </ol>
              )}
            </div>
          </section>
        );
      })}
      <div className="sticky bottom-0 bg-soi-canvas pb-4 pt-2">
        <button type="button" onClick={save} disabled={saving} className={buttonClass('primary', 'lg', 'w-full')}>{saving ? 'Guardando…' : initial ? 'Guardar cambios' : 'Usar este plan'}</button>
        <p className="mt-2 text-center text-sm text-soi-muted">Cada hábito entra a Mi día con su alarma. Lo puedes cambiar cuando quieras.</p>
      </div>
    </div>
  );
}
