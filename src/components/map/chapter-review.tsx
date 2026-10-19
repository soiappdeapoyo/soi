'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { track } from '@/components/providers/analytics';
import { LIFE_AREAS, MAX_FOCUS, lifeArea, type LifeAreaId } from '@/config/life-areas';
import { suggestFocus, type AreaScores } from '@/lib/life-map';
import type { ChapterKind } from '@/lib/chapters';
import { cn } from '@/lib/utils';
import { ScoreScale } from './map-wizard';

type Step =
  | { kind: 'intro' } | { kind: 'score'; area: LifeAreaId } | { kind: 'compare' } | { kind: 'proud' } | { kind: 'lesson' }
  | { kind: 'letgo' } | { kind: 'focus' } | { kind: 'vision' } | { kind: 'letter' };

const TEXTAREA = 'mt-5 w-full resize-none rounded-[14px] bg-white p-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill';

/**
 * Cerrar un capítulo (≈ 10 min, una pregunta por pantalla): la foto de lo que hizo → volver a calificar sus áreas →
 * cómo empezó y cómo termina → de qué está orgullosa → qué aprendió de sí → qué suelta → su foco siguiente →
 * (al cerrar el año) visión nueva y carta a su yo de dentro de un año. Después, su plan de 90 días nuevo.
 */
export function ChapterReview({ kind, periodStart, periodEnd, range, lines, previous, start, prevFocus, prevVision, pastLetter }: {
  kind: ChapterKind;
  periodStart: string;
  periodEnd: string;
  range: string;
  lines: string[];
  previous: AreaScores;
  /** Calificaciones al empezar el capítulo. */
  start: AreaScores;
  prevFocus: LifeAreaId[];
  prevVision: string | null;
  /** La carta que se escribió hace un año (o su primera visión), para leerla al cerrar el año. */
  pastLetter: { text: string; label: string } | null;
}) {
  const router = useRouter();
  const annual = kind === 'anual';
  const [scores, setScores] = useState<AreaScores>({});
  const [proud, setProud] = useState('');
  const [lesson, setLesson] = useState('');
  const [letgo, setLetgo] = useState('');
  const [focus, setFocus] = useState<LifeAreaId[] | null>(null);
  const [vision, setVision] = useState(prevVision ?? '');
  const [letter, setLetter] = useState('');
  const [i, setI] = useState(0);
  const [saving, setSaving] = useState(false);

  const chosen = focus ?? (prevFocus.length ? prevFocus : suggestFocus(scores));
  const steps: Step[] = useMemo(() => [
    { kind: 'intro' },
    ...LIFE_AREAS.map((a) => ({ kind: 'score' as const, area: a.id })),
    { kind: 'compare' }, { kind: 'proud' }, { kind: 'lesson' }, { kind: 'letgo' }, { kind: 'focus' },
    ...(annual ? [{ kind: 'vision' as const }, { kind: 'letter' as const }] : []),
  ], [annual]);
  const step = steps[Math.min(i, steps.length - 1)]!;
  const last = i >= steps.length - 1;

  async function save() {
    setSaving(true);
    const body = {
      kind, period_start: periodStart, period_end: periodEnd, scores, proud, lesson, letting_go: letgo, focus: chosen,
      ...(annual ? { next_vision: vision, letter } : {}),
    };
    const res = await fetch('/api/life-chapter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    const json = await res?.json().catch(() => null);
    if (!res?.ok || !json?.ok) { setSaving(false); toast(json?.message ?? 'No se pudo guardar. Intenta de nuevo.'); return; }
    track('chapter_closed', { kind });
    toast(annual ? 'Cerraste tu año. Empieza uno nuevo.' : 'Capítulo cerrado. Ahora, tu plan para los próximos 90 días.');
    router.push('/mapa/plan');
    router.refresh();
  }

  const next = () => (last ? save() : setI((n) => n + 1));
  const disabled = saving || (step.kind === 'score' && !scores[step.area]) || (step.kind === 'focus' && chosen.length === 0);

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setI((n) => Math.max(0, n - 1))} disabled={i === 0} aria-label="Atrás"
          className="press tap-target -ml-2 grid h-9 w-9 place-items-center rounded-lg text-soi-muted hover:bg-black/[0.04] disabled:opacity-0">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-soi-tray" role="progressbar" aria-valuenow={i + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Avance del cierre">
          <div className="h-full origin-left rounded-full bg-soi-accent transition-transform duration-(--dur-base) ease-out-strong" style={{ transform: `scaleX(${(i + 1) / steps.length})` }} />
        </div>
        <span className="nums w-12 text-right text-xs text-soi-muted">{i + 1} de {steps.length}</span>
      </div>

      <div className="flex-1 pt-8">
        {step.kind === 'intro' && (
          <section>
            <p className="text-sm font-medium text-soi-accent">{range}</p>
            <h1 className="mt-1 text-balance text-[28px] font-semibold leading-tight tracking-tight">{annual ? 'Cierra tu año' : 'Cierra tu capítulo'}</h1>
            <p className="mt-3 text-pretty text-[17px] leading-relaxed text-soi-muted">
              {annual ? 'Un año entero. Mira lo que construiste, lo que aprendiste de ti y elige quién quieres ser el próximo.' : 'Noventa días. Antes de seguir, mira lo que construiste y elige con calma tu siguiente capítulo.'}
            </p>
            {lines.length > 0 && (
              <ul className="mt-6 flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
                {lines.map((l) => <li key={l} className="nums flex items-center gap-2.5 rounded-[14px] bg-white px-3 py-3 text-[15px] shadow-ring"><Check className="h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />{l}</li>)}
              </ul>
            )}
            {annual && pastLetter && (
              <figure className="mt-6 rounded-[20px] bg-soi-accent-soft p-4">
                <figcaption className="text-xs font-medium text-soi-accent">{pastLetter.label}</figcaption>
                <blockquote className="mt-2 whitespace-pre-line text-pretty text-[17px] leading-relaxed">{pastLetter.text}</blockquote>
              </figure>
            )}
          </section>
        )}

        {step.kind === 'score' && (() => {
          const a = lifeArea(step.area)!;
          return (
            <section aria-labelledby="q">
              <p className="flex items-center gap-2 text-sm font-medium text-soi-accent"><Icon name={a.icon} className="h-4 w-4" />{a.label}</p>
              <h1 id="q" className="mt-2 text-balance text-[26px] font-semibold leading-tight tracking-tight">{a.question}</h1>
              {previous[a.id] ? <p className="nums mt-2 text-sm text-soi-muted">La última vez: {previous[a.id]}</p> : null}
              <ScoreScale label={a.question} value={scores[a.id]} onChange={(v) => setScores((s) => ({ ...s, [a.id]: v }))} />
            </section>
          );
        })()}

        {step.kind === 'compare' && (
          <section aria-labelledby="q">
            <h1 id="q" className="text-balance text-[26px] font-semibold leading-tight tracking-tight">Así empezaste y así terminas</h1>
            <ul className="mt-6 flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
              {LIFE_AREAS.map((a) => {
                const from = start[a.id];
                const to = scores[a.id];
                const d = from && to ? to - from : null;
                return (
                  <li key={a.id} className="flex items-center gap-2 rounded-[14px] bg-white px-3 py-3 text-[15px] shadow-ring">
                    <Icon name={a.icon} className="h-4 w-4 text-soi-muted" />
                    <span className="flex-1">{a.label}</span>
                    <span className="nums text-sm text-soi-muted">{from ?? '–'} → <span className="font-medium text-soi-ink">{to ?? '–'}</span></span>
                    {d !== null && d !== 0 && <span className={cn('nums w-8 text-right text-xs', d > 0 ? 'font-medium text-soi-accent' : 'text-soi-muted')}>{d > 0 ? `+${d}` : d}</span>}
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-sm text-soi-muted">Lo que bajó no es un fracaso: es información para tu siguiente capítulo.</p>
          </section>
        )}

        {step.kind === 'proud' && (
          <TextStep title={annual ? '¿Qué logro de este año quieres recordar siempre?' : '¿Qué logro de estos 90 días quieres recordar?'} hint="Grande o pequeño. Lo que de verdad te costó." value={proud} onChange={setProud} max={800} />
        )}
        {step.kind === 'lesson' && (
          <TextStep title="¿Qué aprendiste de ti?" hint="Sobre cómo funcionas: qué te ayuda, qué te frena, cuándo vuelves." value={lesson} onChange={setLesson} max={800} />
        )}
        {step.kind === 'letgo' && (
          <TextStep title="¿Qué sueltas para tu siguiente capítulo?" hint="Un hábito, una creencia, una exigencia que ya no te sirve." value={letgo} onChange={setLetgo} max={400} />
        )}

        {step.kind === 'focus' && (
          <section aria-labelledby="q">
            <h1 id="q" className="text-balance text-[26px] font-semibold leading-tight tracking-tight">¿En qué te enfocas los próximos 90 días?</h1>
            <p className="mt-2 text-[15px] text-soi-muted">Elige hasta {MAX_FOCUS}. Puedes seguir con las mismas o cambiar.</p>
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

        {step.kind === 'vision' && (
          <TextStep title="En un año más, ¿en quién te quieres convertir?" hint="Escríbelo como identidad: «Quiero ser alguien que…». Puedes conservar la que tenías." value={vision} onChange={setVision} max={400} />
        )}
        {step.kind === 'letter' && (
          <TextStep title="Escríbele a quien serás dentro de un año" hint="SOI te la devolverá cuando cierres el próximo año. Cuéntale qué esperas de ella o de él, y qué le pides que no olvide." value={letter} onChange={setLetter} max={2000} rows={8} />
        )}
      </div>

      <div className="sticky bottom-0 bg-soi-canvas pb-4 pt-3">
        <button type="button" onClick={next} disabled={disabled} className={buttonClass('primary', 'lg', 'w-full')}>
          {saving ? 'Guardando…' : step.kind === 'intro' ? 'Empezar' : last ? (annual ? 'Cerrar mi año' : 'Cerrar mi capítulo') : 'Siguiente'}
        </button>
      </div>
    </div>
  );
}

function TextStep({ title, hint, value, onChange, max, rows = 4 }: { title: string; hint: string; value: string; onChange: (v: string) => void; max: number; rows?: number }) {
  return (
    <section aria-labelledby="q">
      <h1 id="q" className="text-balance text-[26px] font-semibold leading-tight tracking-tight">{title}</h1>
      <p className="mt-2 text-[15px] text-soi-muted">{hint}</p>
      <textarea aria-labelledby="q" value={value} onChange={(e) => onChange(e.target.value.slice(0, max))} rows={rows} maxLength={max} className={TEXTAREA} />
      <p className="mt-2 text-sm text-soi-muted">Puedes dejarlo en blanco.</p>
    </section>
  );
}
