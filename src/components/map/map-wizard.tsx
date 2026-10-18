'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { track } from '@/components/providers/analytics';
import { LIFE_AREAS, MAX_FOCUS, lifeArea, type LifeAreaId } from '@/config/life-areas';
import { suggestFocus, type AreaScores } from '@/lib/life-map';
import { cn } from '@/lib/utils';

type Step = { kind: 'intro' } | { kind: 'score'; area: LifeAreaId } | { kind: 'focus' } | { kind: 'target'; area: LifeAreaId } | { kind: 'vision' };

const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * El diagnóstico de "Tu mapa" (≈ 5 min). Inicial: cada área del 1 al 10 → hasta 2 áreas de enfoque → a dónde
 * llevarlas en 90 días y cómo se vería → la visión ("En un año, quiero ser alguien que…").
 * Mensual: solo vuelve a calificar (con la calificación anterior de referencia); la distancia se recalcula sola.
 * Una pregunta por pantalla, botones de 44 px y sin animación entre pasos (es un formulario, no una celebración).
 */
export function MapWizard({ mode, previous, prevFocus, prevTargets, prevWants, prevVision, visionHint }: {
  mode: 'inicial' | 'mensual';
  previous: AreaScores;
  prevFocus: LifeAreaId[];
  prevTargets: AreaScores;
  prevWants: Partial<Record<LifeAreaId, string>>;
  prevVision: string | null;
  /** Lo que SOI ya sabe de su norte (propósito o identidad) para empezar la visión. */
  visionHint: string | null;
}) {
  const router = useRouter();
  const [scores, setScores] = useState<AreaScores>({});
  const [focus, setFocus] = useState<LifeAreaId[] | null>(mode === 'mensual' ? prevFocus : null);
  const [targets, setTargets] = useState<AreaScores>(prevTargets);
  const [wants, setWants] = useState<Partial<Record<LifeAreaId, string>>>(prevWants);
  const [vision, setVision] = useState(prevVision ?? '');
  const [i, setI] = useState(0);
  const [saving, setSaving] = useState(false);

  const chosen = focus ?? suggestFocus(scores);
  const steps: Step[] = useMemo(() => [
    { kind: 'intro' },
    ...LIFE_AREAS.map((a) => ({ kind: 'score' as const, area: a.id })),
    ...(mode === 'inicial' ? [{ kind: 'focus' as const }, ...chosen.map((area) => ({ kind: 'target' as const, area })), { kind: 'vision' as const }] : []),
  ], [mode, chosen]);
  const step = steps[Math.min(i, steps.length - 1)]!;
  const last = i >= steps.length - 1;

  const next = () => (last ? save() : setI((n) => n + 1));
  const back = () => setI((n) => Math.max(0, n - 1));

  async function save() {
    setSaving(true);
    const body = mode === 'inicial'
      ? { kind: mode, scores, focus: chosen, targets: Object.fromEntries(chosen.filter((a) => targets[a]).map((a) => [a, targets[a]])), wants: Object.fromEntries(chosen.map((a) => [a, wants[a] ?? ''])), vision }
      : { kind: mode, scores };
    const res = await fetch('/api/life-map', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const ok = res?.ok && (await res.json().catch(() => null))?.ok;
    if (!ok) { setSaving(false); toast('No se pudo guardar. Intenta de nuevo.'); return; }
    track(mode === 'inicial' ? 'map_completed' : 'map_checkin_completed', { focus: chosen.join(',') });
    // Después del primer mapa, el plan; después de un chequeo, ver cuánto avanzó.
    router.push(mode === 'inicial' ? '/mapa/plan' : '/mi-vida?tab=mapa');
    router.refresh();
  }

  const progress = (i + 1) / steps.length;

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="flex items-center gap-3">
        <button type="button" onClick={back} disabled={i === 0} aria-label="Atrás"
          className="press tap-target -ml-2 grid h-9 w-9 place-items-center rounded-lg text-soi-muted hover:bg-black/[0.04] disabled:opacity-0">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-soi-tray" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Avance del mapa">
          <div className="h-full origin-left rounded-full bg-soi-accent transition-transform duration-(--dur-base) ease-out-strong" style={{ transform: `scaleX(${progress})` }} />
        </div>
        <span className="nums w-12 text-right text-xs text-soi-muted">{i + 1} de {steps.length}</span>
      </div>

      <div className="flex-1 pt-8">
        {step.kind === 'intro' && (
          <section>
            <h1 className="text-balance text-[28px] font-semibold leading-tight tracking-tight">{mode === 'inicial' ? 'Tu mapa, en 5 minutos' : 'Tu chequeo del mes'}</h1>
            <p className="mt-3 text-pretty text-[17px] leading-relaxed text-soi-muted">
              {mode === 'inicial'
                ? 'Seis áreas de tu vida, del 1 al 10. No hay respuestas correctas: es tu punto de partida. Con esto SOI sabe dónde estás, a dónde quieres ir y cómo guiar tus días.'
                : 'Vuelve a calificar tus seis áreas. Verás tu calificación anterior para comparar. Con esto SOI mide cuánto has avanzado de verdad.'}
            </p>
            <ul className="mt-6 grid grid-cols-2 gap-2">
              {LIFE_AREAS.map((a) => (
                <li key={a.id} className="flex items-center gap-2 rounded-[14px] bg-soi-sidebar px-3 py-2.5 text-sm">
                  <Icon name={a.icon} className="h-4 w-4 text-soi-accent" />{a.short}
                </li>
              ))}
            </ul>
          </section>
        )}

        {step.kind === 'score' && (() => {
          const a = lifeArea(step.area)!;
          const value = scores[a.id];
          const prev = previous[a.id];
          return (
            <section aria-labelledby="q">
              <p className="flex items-center gap-2 text-sm font-medium text-soi-accent"><Icon name={a.icon} className="h-4 w-4" />{a.label}</p>
              <h1 id="q" className="mt-2 text-balance text-[26px] font-semibold leading-tight tracking-tight">{a.question}</h1>
              {prev ? <p className="nums mt-2 text-sm text-soi-muted">La última vez: {prev}</p> : null}
              <ScoreScale label={a.question} value={value} onChange={(v) => setScores((s) => ({ ...s, [a.id]: v }))} />
            </section>
          );
        })()}

        {step.kind === 'focus' && (
          <section aria-labelledby="q">
            <h1 id="q" className="text-balance text-[26px] font-semibold leading-tight tracking-tight">¿En qué quieres enfocarte estos 90 días?</h1>
            <p className="mt-2 text-[15px] text-soi-muted">Elige hasta {MAX_FOCUS}. Marcamos las que calificaste más bajo; cambia lo que quieras.</p>
            <div role="group" aria-label="Áreas de enfoque" className="mt-6 flex flex-col gap-2">
              {LIFE_AREAS.map((a) => {
                const on = chosen.includes(a.id);
                const full = !on && chosen.length >= MAX_FOCUS;
                return (
                  <button key={a.id} type="button" aria-pressed={on} disabled={full}
                    onClick={() => setFocus(on ? chosen.filter((x) => x !== a.id) : [...chosen, a.id])}
                    className={cn('press flex min-h-12 items-center gap-3 rounded-[14px] px-4 py-3 text-left', on ? 'bg-soi-ink text-white' : 'bg-white shadow-ring hover:bg-soi-tray', full && 'opacity-50')}>
                    <Icon name={a.icon} className={cn('h-5 w-5', on ? 'text-white' : 'text-soi-accent')} />
                    <span className="flex-1 font-medium">{a.label}</span>
                    <span className={cn('nums text-sm', on ? 'text-white/70' : 'text-soi-muted')}>{scores[a.id] ?? '–'}/10</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step.kind === 'target' && (() => {
          const a = lifeArea(step.area)!;
          const now = scores[a.id] ?? 1;
          return (
            <section aria-labelledby="q">
              <p className="flex items-center gap-2 text-sm font-medium text-soi-accent"><Icon name={a.icon} className="h-4 w-4" />{a.label} · hoy {now}/10</p>
              <h1 id="q" className="mt-2 text-balance text-[26px] font-semibold leading-tight tracking-tight">¿A dónde quieres llevarla en 90 días?</h1>
              <p className="mt-2 text-[15px] text-soi-muted">Una meta creíble suele estar 2 o 3 puntos arriba de donde estás.</p>
              <ScoreScale label="Tu meta a 90 días" value={targets[a.id]} min={Math.min(10, now + 1)} onChange={(v) => setTargets((t) => ({ ...t, [a.id]: v }))} />
              <label className="mt-6 block">
                <span className="text-sm font-medium">¿Cómo se vería tu vida con un {targets[a.id] ?? Math.min(10, now + 2)}?</span>
                <textarea value={wants[a.id] ?? ''} onChange={(e) => setWants((w) => ({ ...w, [a.id]: e.target.value.slice(0, 200) }))} rows={3} maxLength={200}
                  placeholder="Por ejemplo: duermo 7 horas y tengo energía para entrenar 3 veces por semana."
                  className="mt-2 w-full resize-none rounded-[14px] bg-white p-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
              </label>
            </section>
          );
        })()}

        {step.kind === 'vision' && (
          <section aria-labelledby="q">
            <h1 id="q" className="text-balance text-[26px] font-semibold leading-tight tracking-tight">En un año, ¿en quién te quieres convertir?</h1>
            <p className="mt-2 text-[15px] text-soi-muted">Escríbelo como identidad, no como meta: «Quiero ser alguien que…».</p>
            <textarea value={vision} onChange={(e) => setVision(e.target.value.slice(0, 400))} rows={4} maxLength={400}
              placeholder={visionHint ?? 'Quiero ser alguien que cuida su cuerpo, termina lo que empieza y vive con calma.'}
              className="mt-5 w-full resize-none rounded-[14px] bg-white p-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
            <p className="mt-2 text-sm text-soi-muted">Puedes cambiarlo cuando quieras.</p>
          </section>
        )}
      </div>

      <div className="sticky bottom-0 bg-soi-canvas pb-4 pt-3">
        <button type="button" onClick={next} disabled={saving || (step.kind === 'score' && !scores[step.area]) || (step.kind === 'focus' && chosen.length === 0)}
          className={buttonClass('primary', 'lg', 'w-full')}>
          {saving ? 'Guardando…' : step.kind === 'intro' ? 'Empezar' : last ? 'Ver mi mapa' : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}

/** 1 a 10 en dos filas de 5 (cada botón ≥ 44 px a 375 px). */
export function ScoreScale({ label, value, onChange, min = 1 }: { label: string; value?: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="mt-6">
      <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-2">
        {SCALE.map((n) => {
          const on = value === n;
          const off = n < min;
          return (
            <button key={n} type="button" role="radio" aria-checked={on} disabled={off} onClick={() => onChange(n)}
              className={cn('press nums h-12 rounded-[14px] text-[17px] font-medium', on ? 'bg-soi-ink text-white' : 'bg-white shadow-ring hover:bg-soi-tray', off && 'opacity-35')}>
              {n}
            </button>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-soi-muted"><span>Muy mal</span><span>Excelente</span></div>
    </div>
  );
}
