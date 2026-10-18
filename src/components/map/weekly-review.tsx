'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { track } from '@/components/providers/analytics';
import { LIFE_AREAS, lifeArea, type LifeAreaId } from '@/config/life-areas';
import type { AreaScores } from '@/lib/life-map';
import { ScoreScale } from './map-wizard';
import { cn } from '@/lib/utils';

export type WeekSummary = {
  weekStart: string;
  /** Rango legible ("13 al 19 de octubre"). */
  range: string;
  moments: number;
  /** Por hábito del plan: días que lo hizo esta semana. */
  habits: { name: string; days: number }[];
  /** Por área de enfoque: evidencia de la semana y la calificación anterior. */
  focus: { area: LifeAreaId; evidence: number; current: number | null }[];
};

type Step = 'summary' | `score:${LifeAreaId}` | 'wins' | 'lesson' | 'next';

/**
 * La revisión de la semana (≈ 3 min): lo que hiciste (sin juicio) → cómo están tus áreas de enfoque → qué funcionó →
 * qué aprendiste → el foco de la semana que empieza (un área y UNA cosa). Lo escrito llega a la memoria de SOI.
 */
export function WeeklyReview({ s }: { s: WeekSummary }) {
  const router = useRouter();
  const steps: Step[] = ['summary', ...s.focus.map((f) => `score:${f.area}` as const), 'wins', 'lesson', 'next'];
  const [i, setI] = useState(0);
  const [scores, setScores] = useState<AreaScores>({});
  const [wins, setWins] = useState('');
  const [lesson, setLesson] = useState('');
  const [area, setArea] = useState<LifeAreaId | null>(s.focus[0]?.area ?? null);
  const [oneThing, setOneThing] = useState('');
  const [saving, setSaving] = useState(false);
  const step = steps[i]!;
  const last = i === steps.length - 1;

  async function save() {
    if (!area || oneThing.trim().length < 2) return;
    setSaving(true);
    const res = await fetch('/api/life-review', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekStart: s.weekStart, scores, wins, lesson, area, oneThing }),
    }).catch(() => null);
    if (!res?.ok) { setSaving(false); toast('No se pudo guardar tu revisión. Intenta de nuevo.'); return; }
    track('weekly_review_completed', { area, moments: s.moments });
    toast('Listo. Tu semana tiene foco.');
    router.push('/hoy');
    router.refresh();
  }

  const disabled = saving || (step.startsWith('score:') && !scores[step.slice(6) as LifeAreaId]) || (step === 'next' && (!area || oneThing.trim().length < 2));
  const area0 = step.startsWith('score:') ? lifeArea(step.slice(6))! : null;
  const prev = area0 ? s.focus.find((f) => f.area === area0.id)?.current : null;

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => (i === 0 ? router.back() : setI(i - 1))} aria-label="Atrás"
          className="press tap-target -ml-2 grid h-9 w-9 place-items-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-soi-tray" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Avance de la revisión">
          <div className="h-full origin-left rounded-full bg-soi-accent transition-transform duration-(--dur-base) ease-out-strong" style={{ transform: `scaleX(${(i + 1) / steps.length})` }} />
        </div>
      </div>

      <div className="flex-1 pt-8">
        {step === 'summary' && (
          <section>
            <p className="text-sm text-soi-muted">{s.range}</p>
            <h1 className="mt-1 text-balance text-[28px] font-semibold leading-tight tracking-tight">Tu semana</h1>
            <p className="mt-2 text-[17px] text-soi-muted">Sin juicio: solo mirar lo que pasó para decidir la siguiente.</p>
            <ul className="mt-6 flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
              <li className="flex items-center justify-between rounded-[14px] bg-white px-3 py-3 shadow-ring">
                <span>Moments vividos</span><span className="nums font-semibold">{s.moments}</span>
              </li>
              {s.habits.map((h) => (
                <li key={h.name} className="flex items-center justify-between gap-3 rounded-[14px] bg-white px-3 py-3 shadow-ring">
                  <span className="min-w-0 truncate">{h.name}</span><span className="nums shrink-0 font-semibold">{h.days} de 7 días</span>
                </li>
              ))}
              {s.focus.map((f) => (
                <li key={f.area} className="flex items-center justify-between gap-3 rounded-[14px] bg-white px-3 py-3 shadow-ring">
                  <span className="flex items-center gap-2"><Icon name={lifeArea(f.area)!.icon} className="h-4 w-4 text-soi-accent" />Evidencia en {lifeArea(f.area)!.short.toLowerCase()}</span>
                  <span className="nums font-semibold">{f.evidence}</span>
                </li>
              ))}
            </ul>
            {s.moments === 0 && <p className="mt-4 text-[15px] text-soi-muted">Fue una semana sin Moments. Pasa. Lo que importa es lo que eliges ahora.</p>}
          </section>
        )}

        {area0 && (
          <section aria-labelledby="q">
            <p className="flex items-center gap-2 text-sm font-medium text-soi-accent"><Icon name={area0.icon} className="h-4 w-4" />{area0.label}</p>
            <h1 id="q" className="mt-2 text-balance text-[26px] font-semibold leading-tight tracking-tight">¿Cómo está hoy, del 1 al 10?</h1>
            {prev ? <p className="nums mt-2 text-sm text-soi-muted">La última vez: {prev}</p> : null}
            <ScoreScale label={`${area0.label} hoy`} value={scores[area0.id]} onChange={(v) => setScores((x) => ({ ...x, [area0.id]: v }))} />
          </section>
        )}

        {step === 'wins' && (
          <TextStep id="wins" title="¿Qué funcionó esta semana?" hint="Algo que hiciste, aunque sea pequeño. Eso también es evidencia." value={wins} onChange={setWins} placeholder="Me levanté a caminar 4 días, aunque costó." />
        )}
        {step === 'lesson' && (
          <TextStep id="lesson" title="¿Qué aprendiste o qué te frenó?" hint="Sin culparte: ¿qué cambiarías de cómo está armado tu día?" value={lesson} onChange={setLesson} placeholder="Cuando dejo el celular junto a la cama, no me levanto." />
        )}

        {step === 'next' && (
          <section aria-labelledby="q">
            <h1 id="q" className="text-balance text-[26px] font-semibold leading-tight tracking-tight">Tu foco para la semana que empieza</h1>
            <p className="mt-2 text-[15px] text-soi-muted">Un área y UNA cosa. SOI la tendrá presente toda la semana.</p>
            <div role="radiogroup" aria-label="Área" className="mt-5 flex flex-wrap gap-1.5">
              {(s.focus.length ? s.focus.map((f) => lifeArea(f.area)!) : LIFE_AREAS).map((a) => (
                <button key={a.id} type="button" role="radio" aria-checked={area === a.id} onClick={() => setArea(a.id)}
                  className={cn('press inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-sm', area === a.id ? 'bg-soi-ink text-white' : 'bg-white shadow-ring hover:bg-soi-tray')}>
                  <Icon name={a.icon} className="h-4 w-4" />{a.short}
                </button>
              ))}
            </div>
            <label className="mt-5 block text-sm font-medium">La cosa que harás esta semana
              <input value={oneThing} onChange={(e) => setOneThing(e.target.value.slice(0, 200))} maxLength={200}
                placeholder="Dejar el celular fuera del cuarto todas las noches"
                className="mt-1.5 w-full rounded-[14px] bg-white px-3 py-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
            </label>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 bg-soi-canvas pb-4 pt-3">
        <button type="button" onClick={() => (last ? save() : setI(i + 1))} disabled={disabled} className={buttonClass('primary', 'lg', 'w-full')}>
          {saving ? 'Guardando…' : step === 'summary' ? 'Empezar' : last ? 'Cerrar mi semana' : 'Siguiente'}
        </button>
        {(step === 'wins' || step === 'lesson') && (
          <button type="button" onClick={() => setI(i + 1)} className={buttonClass('ghost', 'md', 'mt-1 w-full text-soi-muted')}>Saltar</button>
        )}
      </div>
    </div>
  );
}

function TextStep({ id, title, hint, value, onChange, placeholder }: { id: string; title: string; hint: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <section aria-labelledby={id}>
      <h1 id={id} className="text-balance text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>
      <p className="mt-2 text-[15px] text-soi-muted">{hint}</p>
      <textarea value={value} onChange={(e) => onChange(e.target.value.slice(0, 600))} rows={4} maxLength={600} placeholder={placeholder} aria-labelledby={id}
        className="mt-5 w-full resize-none rounded-[14px] bg-white p-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
    </section>
  );
}
