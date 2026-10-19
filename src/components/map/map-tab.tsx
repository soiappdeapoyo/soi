import Link from 'next/link';
import { ArrowRight, BookOpen, CalendarCheck, Flag, History, MessageCircle, Repeat, Sparkles } from 'lucide-react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { Icon } from '@/components/ui/icon';
import { LIFE_AREAS_WORD } from '@/config/life-areas';
import { buttonClass } from '@/components/ui/button';
import { loadMapView, loadValues } from '@/lib/life-map-server';
import { detectConflicts } from '@/lib/values';
import { loadWhatWorks } from '@/lib/what-works-server';
import { MIN_SAMPLES, driftLine, whatWorksLines } from '@/lib/what-works';
import { loadChapterDue } from '@/lib/chapters-server';
import { ValuesEditor } from './values-editor';
import { loadKnown } from '@/lib/self-knowledge-server';
import { areaLine, type AreaView } from '@/lib/life-map';
import { loadLastReview, loadPlan } from '@/lib/life-plan-server';
import { currentWeek } from '@/lib/life-plan';
import { KnownList } from './known-list';
import { VisionEditor } from './vision-editor';

/**
 * Mi mapa: quién eres hoy (tus áreas y lo que SOI sabe de ti), quién quieres ser (visión y metas) y la distancia
 * (lo que falta y lo que ya cerraste). Sin IA: todo sale de lo que la persona calificó y de su evidencia.
 */
export async function MapTab({ supabase, userId, profile, timeZone }: { supabase: SupabaseClient; userId: string; profile: UserProfile | null; timeZone: string }) {
  const [view, known, plan, last, values, works, chapter] = await Promise.all([
    loadMapView(supabase, userId, profile, timeZone),
    loadKnown(supabase, userId, profile),
    loadPlan(supabase, userId),
    loadLastReview(supabase, userId),
    loadValues(supabase, userId).catch(() => []),
    loadWhatWorks(supabase, userId, timeZone).catch(() => null),
    loadChapterDue(supabase, userId, timeZone).catch(() => null),
  ]);
  const conflicts = detectConflicts(values, view.areas);
  const worksLines = works ? whatWorksLines(works.works) : [];
  const week = currentWeek(last.review, timeZone);
  // Mes del plan (1–3) para resaltar el hito que toca.
  const month = plan?.starts_on ? Math.min(3, Math.max(1, Math.floor((Date.now() - Date.parse(`${plan.starts_on}T12:00:00Z`)) / (30 * 86_400_000)) + 1)) : 1;

  return (
    <div className="flex flex-col gap-8">
      {!view.hasMap ? (
        <section aria-labelledby="map-start" className="rounded-[28px] bg-soi-ink p-2 text-white">
          <div className="px-4 pb-4 pt-4">
            <p className="text-xs font-medium text-white/60">5 minutos</p>
            <h2 id="map-start" className="mt-1 text-balance text-[22px] font-semibold leading-snug">Dibuja tu mapa</h2>
            <p className="mt-1 text-[15px] text-white/75">Dónde estás hoy en {LIFE_AREAS_WORD} áreas de tu vida, a dónde quieres llegar y cuánto te falta. Con eso SOI guía tus días y te muestra cómo cierras la distancia.</p>
            <Link href="/mapa/diagnostico" className="press tap-target mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] bg-white py-3.5 text-[17px] font-semibold text-soi-ink">
              Hacer mi mapa <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="vision-h">
            <h2 id="vision-h" className="pb-2 text-xs font-medium text-soi-muted">Hacia dónde vas</h2>
            <VisionEditor vision={view.vision} />
          </section>

          {week && (
            <p className="flex items-start gap-2 rounded-[20px] bg-soi-sidebar p-4 text-[15px]">
              <CalendarCheck className="mt-0.5 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />
              <span><span className="text-soi-muted">Esta semana · {week.label}:</span> <span className="font-medium">{week.one_thing}</span></span>
            </p>
          )}

          {chapter?.due ? (
            <Link href="/mapa/capitulo" className="press flex items-center gap-3 rounded-[20px] bg-soi-ink p-4 text-white">
              <Flag className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="flex-1">
                <span className="block font-medium">{chapter.due.kind === 'anual' ? 'Cierra tu año · 10 min' : 'Cierra tu capítulo de 90 días · 10 min'}</span>
                <span className="block text-sm text-white/70">Mira cuánto avanzaste, qué aprendiste de ti y elige tu siguiente capítulo.</span>
              </span>
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          ) : view.checkinDue ? (
            <Link href="/mapa/diagnostico" className="press flex items-center gap-3 rounded-[20px] bg-soi-accent-soft p-4">
              <span className="flex-1">
                <span className="block font-medium text-soi-ink">Tu chequeo del mes · 2 min</span>
                <span className="block text-sm text-soi-muted">Vuelve a calificar tus áreas y mira cuánto avanzaste.</span>
              </span>
              <ArrowRight className="h-5 w-5 text-soi-accent" aria-hidden="true" />
            </Link>
          ) : null}

          {view.focus.length > 0 && (
            <section aria-labelledby="dist-h">
              <h2 id="dist-h" className="px-1 pb-2 text-xs font-medium text-soi-muted">La distancia · tus 90 días</h2>
              <ul className="flex flex-col gap-3">
                {view.focus.map((a) => (
                  <li key={a.area.id} className="rounded-[28px] bg-soi-tray p-2">
                    <div className="rounded-[20px] bg-white p-4 shadow-ring">
                      <p className="flex items-center gap-2 font-medium"><Icon name={a.area.icon} className="h-4 w-4 text-soi-accent" />{a.area.label}</p>
                      <AreaMeter a={a} large />
                      <p className="mt-2 text-sm text-soi-muted">{areaLine(a)}</p>
                      {(() => {
                        const p = plan?.areas.find((x) => x.area === a.area.id);
                        if (!p) return a.want ? <p className="mt-3 border-l-2 border-soi-accent-soft pl-3 text-[15px] leading-snug">{a.want}</p> : null;
                        return (
                          <div className="mt-3 flex flex-col gap-2 border-t border-black/5 pt-3 text-[15px]">
                            <p><span className="text-soi-muted">Meta a 90 días:</span> {p.goal}</p>
                            <p><span className="text-soi-muted">Quién eliges ser:</span> {p.identity}</p>
                            <p className="flex items-start gap-2"><Repeat className="mt-1 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />
                              <span>{p.habit.tiny} <span className="text-soi-muted">· {p.habit.cue}{p.habit.time ? ` · ${p.habit.time}` : ''}</span></span>
                            </p>
                            {p.milestones[month - 1] && <p className="text-sm text-soi-muted"><span className="nums font-medium text-soi-accent">Mes {month}:</span> {p.milestones[month - 1]!.replace(/^Mes \d:\s*/, '')}</p>}
                          </div>
                        );
                      })()}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                        <span className="nums text-sm text-soi-muted">{a.evidence30 === 0 ? 'Aún sin evidencia este mes' : `${a.evidence30} ${a.evidence30 === 1 ? 'evidencia' : 'evidencias'} este mes`}</span>
                        <Link href={`/chat?nueva=1&agent=${a.area.agent}`} className={buttonClass('outline', 'sm')}>
                          <MessageCircle className="h-4 w-4" aria-hidden="true" /> Trabajarlo con SOI
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="values-h">
            <h2 id="values-h" className="px-1 pb-2 text-xs font-medium text-soi-muted">Lo que más te importa</h2>
            <div className="rounded-[20px] bg-white p-4 shadow-ring">
              <ValuesEditor values={values.map((v) => v.id)} />
              {conflicts.map((c) => (
                <div key={`${c.kind}:${c.value?.id ?? 'focus'}`} className="mt-4 border-t border-black/5 pt-3">
                  <p className="text-xs font-medium text-soi-accent">Algo no cuadra</p>
                  <p className="mt-1 text-[15px] leading-snug">{c.text}</p>
                  <Link href={`/chat?nueva=1&agent=${c.agent}`} className="press mt-2 inline-flex items-center gap-1.5 text-sm text-soi-accent">
                    <MessageCircle className="h-4 w-4" aria-hidden="true" /> Hablarlo con SOI
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <Link href="/mapa/plan" className="press flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
            <span className="flex-1">
              <span className="block font-medium">{plan ? 'Ajustar mi plan de 90 días' : 'Arma tu plan de 90 días'}</span>
              <span className="block text-sm text-soi-muted">{plan ? 'Metas, identidades y hábitos de tus áreas de enfoque.' : 'Una meta, quién eliges ser y un hábito de 2 minutos por área. SOI lo propone.'}</span>
            </span>
            <ArrowRight className="h-5 w-5 text-soi-accent" aria-hidden="true" />
          </Link>

          <section aria-labelledby="hoy-h">
            <h2 id="hoy-h" className="px-1 pb-2 text-xs font-medium text-soi-muted">Tu vida hoy</h2>
            <ul className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
              {view.areas.map((a) => (
                <li key={a.area.id} className="rounded-[14px] bg-white px-3 py-3 shadow-ring">
                  <div className="flex items-center gap-2 text-[15px]">
                    <Icon name={a.area.icon} className="h-4 w-4 text-soi-muted" />
                    <span className="flex-1">{a.area.label}</span>
                    {a.change !== null && a.change !== 0 && (
                      <span className={a.change > 0 ? 'nums text-xs font-medium text-soi-accent' : 'nums text-xs text-soi-muted'}>{a.change > 0 ? `+${a.change}` : a.change}</span>
                    )}
                    <span className="nums w-10 text-right text-sm font-medium">{a.current ?? '–'}/10</span>
                  </div>
                  <AreaMeter a={a} />
                </li>
              ))}
            </ul>
            <p className="mt-2 px-1 text-sm text-soi-muted">
              {view.checkinInDays ? `Tu próximo chequeo es en ${view.checkinInDays} ${view.checkinInDays === 1 ? 'día' : 'días'}. ` : ''}
              <Link href="/mapa/diagnostico?tipo=inicial" className="text-soi-accent underline-offset-2 hover:underline">Cambiar mi enfoque o rehacer mi mapa</Link>
            </p>
          </section>
        </>
      )}

      <section aria-labelledby="works-h">
        <h2 id="works-h" className="text-lg font-semibold tracking-tight">Lo que te funciona</h2>
        <p className="mb-3 mt-1 text-sm text-soi-muted">SOI lo aprende de lo que ya viviste y lo usa para elegir lo que te propone.</p>
        {works?.drift[0] && (
          <Link href={`/m/${works.drift[0].moment_id}/play`} className="press mb-3 flex items-start gap-3 rounded-[20px] bg-soi-accent-soft p-4">
            <Repeat className="mt-0.5 h-5 w-5 shrink-0 text-soi-accent" aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-medium">Retoma «{works.drift[0].name}» en pequeño</span>
              <span className="block text-sm text-soi-muted">{driftLine(works.drift[0])}</span>
            </span>
          </Link>
        )}
        {worksLines.length ? (
          <ul className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
            {worksLines.map((l) => (
              <li key={l} className="flex items-start gap-2.5 rounded-[14px] bg-white px-3 py-3 text-[15px] leading-snug shadow-ring">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-soi-accent" aria-hidden="true" />{l}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[20px] bg-soi-sidebar p-4 text-[15px] text-soi-muted">
            SOI todavía te está conociendo. Después de {MIN_SAMPLES} Moments te dirá a qué hora, de cuánto tiempo y con qué prácticas te va mejor.
          </p>
        )}
      </section>

      <nav aria-label="Tu historia y tu aprendizaje" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Link href="/mapa/historia" className="press flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
          <History className="h-5 w-5 shrink-0 text-soi-accent" aria-hidden="true" />
          <span className="flex-1">
            <span className="block font-medium">Tu historia</span>
            <span className="block text-sm text-soi-muted">Tus capítulos, decisiones, regresos y lo que ya es tuyo.</span>
          </span>
        </Link>
        <Link href="/aprender" className="press flex items-center gap-3 rounded-[20px] bg-white p-4 shadow-ring hover:shadow-soft">
          <BookOpen className="h-5 w-5 shrink-0 text-soi-accent" aria-hidden="true" />
          <span className="flex-1">
            <span className="block font-medium">Lo que aprendes</span>
            <span className="block text-sm text-soi-muted">Convierte un libro o un video en una acción, y mira si funcionó.</span>
          </span>
        </Link>
      </nav>

      <section aria-labelledby="known-h">
        <h2 id="known-h" className="text-lg font-semibold tracking-tight">Lo que SOI sabe de ti</h2>
        <p className="mb-4 mt-1 text-sm text-soi-muted">Es lo que SOI usa para acompañarte. Si algo no es así, bórralo y SOI deja de tomarlo en cuenta.</p>
        <KnownList items={known} />
        <Link href="/chat?nueva=1" className="press mt-4 inline-flex items-center gap-2 text-sm text-soi-accent">
          <MessageCircle className="h-4 w-4" aria-hidden="true" /> ¿Falta algo importante? Cuéntaselo a SOI
        </Link>
      </section>
    </div>
  );
}

/**
 * Barra de 1 a 10: relleno hasta hoy, una marca donde empezaste y otra en tu meta.
 * El texto accesible dice lo mismo que se ve (nada solo con color).
 */
function AreaMeter({ a, large = false }: { a: AreaView; large?: boolean }) {
  const pct = (v: number) => `${(v / 10) * 100}%`;
  const label = a.current === null ? 'Sin medir' : `Hoy ${a.current} de 10${a.baseline !== null && a.baseline !== a.current ? `, empezaste en ${a.baseline}` : ''}${a.target ? `, tu meta es ${a.target}` : ''}`;
  return (
    <div className={large ? 'mt-3' : 'mt-2'}>
      <div role="img" aria-label={label} className={`relative overflow-visible rounded-full bg-soi-tray ${large ? 'h-2.5' : 'h-1.5'}`}>
        {a.current !== null && <div className="absolute inset-y-0 left-0 origin-left rounded-full bg-soi-accent" style={{ width: '100%', transform: `scaleX(${a.current / 10})` }} />}
        {a.baseline !== null && a.baseline !== a.current && (
          <span aria-hidden="true" className="absolute -inset-y-1 w-0.5 -translate-x-1/2 rounded-full bg-soi-ink/40" style={{ left: pct(a.baseline) }} />
        )}
        {a.target !== null && (
          <span aria-hidden="true" className="absolute -inset-y-1.5 w-1 -translate-x-1/2 rounded-full bg-soi-ink" style={{ left: pct(a.target) }} />
        )}
      </div>
      {large && a.current !== null && (
        <div className="nums mt-1.5 flex justify-between text-xs text-soi-muted">
          <span>{a.baseline !== null && a.baseline !== a.current ? `Empezaste en ${a.baseline}` : 'Hoy'}</span>
          <span>{a.target ? `Hoy ${a.current} · meta ${a.target}` : `Hoy ${a.current}`}</span>
        </div>
      )}
    </div>
  );
}
