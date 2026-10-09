'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, ArrowUp, Brain, Eye, Footprints, Heart, List, Pause, Pencil, Play, RefreshCw, Sparkles, Target, Timer, Volume2, Wind, X,
  type LucideIcon,
} from 'lucide-react';
import type { FilmIcon, FilmScript } from '@/config/emotions';
import { cn } from '@/lib/utils';
import { track } from '@/components/providers/analytics';
import { trackFunnel } from '@/lib/analytics/funnel-client';
import { filmDetail, type FilmInteraction } from '@/lib/analytics/funnel';

const ICONS: Record<FilmIcon, LucideIcon> = {
  wind: Wind, brain: Brain, eye: Eye, pencil: Pencil, sparkles: Sparkles, arrow: ArrowRight, timer: Timer,
  heart: Heart, refresh: RefreshCw, list: List, target: Target, footprints: Footprints,
};

/** Las cinco escenas: el valor de SOI es convertir lo que sientes hoy en un Moment hecho para ti que se vuelve evidencia. */
const SCENES = [
  { title: 'Le cuentas cómo te sientes', line: 'Con tus palabras, sin formularios.' },
  { title: 'SOI te escucha primero', line: 'Pregunta antes de proponer y recuerda lo que le contaste.' },
  { title: 'Diseña un Moment para ti', line: 'Una práctica corta, con técnicas de autores reales, hecha con lo que te pasa hoy.' },
  { title: 'Lo vives guiado por voz', line: 'Una acción a la vez. Solo tienes que seguirla.' },
  { title: 'Se vuelve evidencia', line: 'Cada Moment prueba en quién te estás convirtiendo.' },
] as const;

const TYPE_START = 500;
const TYPE_MS = 30;
const GAP = 12;
/** Un ciclo de la respiración del halo (ms); la frase de la voz cambia a la mitad. */
const BREATH_MS = 5200;

/**
 * "Cómo funciona SOI" como un video corto, hecho con la UI real (no un video: pesa nada y se lee en cualquier idioma
 * del sistema). Corre solo, se pausa fuera de pantalla o con la pestaña oculta, tiene pausa y escenas tocables
 * (WCAG 2.2.2) y, con movimiento reducido, no arranca solo y muestra cada escena completa. La parte visual es
 * decorativa: el guion completo va en texto para lectores de pantalla.
 */
export function HowItWorksFilm({ script, tone = 'light', className, trackAs }: {
  script: FilmScript; tone?: 'light' | 'dark'; className?: string;
  /** Lugar para el embudo de /panel/analytics (`landing`, `emociones`, `emociones:<slug>`); sin él no se mide. */
  trackAs?: string;
}) {
  const typeEnd = TYPE_START + script.message.length * TYPE_MS;
  const durations = useMemo(() => [Math.max(5000, typeEnd + 1700), 4800, 5800, 6400, 5800], [typeEnd]);

  const [scene, setScene] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [loop, setLoop] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [inView, setInView] = useState(false);
  const [docVisible, setDocVisible] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setReduced(true); setPlaying(false); }
    const onVis = () => setDocVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    const io = new IntersectionObserver(([e]) => setInView(Boolean(e?.isIntersecting)), { threshold: 0.35 });
    if (rootRef.current) io.observe(rootRef.current);
    return () => { document.removeEventListener('visibilitychange', onVis); io.disconnect(); };
  }, []);

  const running = playing && inView && docVisible;

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = now - last;
      last = now;
      setElapsed((e) => e + dt);
    }, 50);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (elapsed < durations[scene]!) return;
    setScene((s) => (s + 1) % SCENES.length);
    setElapsed(0);
    setLoop((l) => l + 1);
  }, [elapsed, scene, durations]);

  // Medición: cada escena alcanzada una vez por carga (mientras corre o al tocarla) y las interacciones.
  const sentScenes = useRef(new Set<number>());
  const reach = (i: number) => {
    if (!trackAs || sentScenes.current.has(i)) return;
    sentScenes.current.add(i);
    trackFunnel('film_progress', filmDetail(trackAs, i + 1));
    track('film_progress', { where: trackAs, scene: i + 1 });
  };
  const interact = (what: FilmInteraction) => {
    if (!trackAs) return;
    trackFunnel('film_interact', filmDetail(trackAs, what));
    track('film_interact', { where: trackAs, what });
  };
  useEffect(() => { if (running) reach(scene); });

  const goTo = (i: number) => { setScene(i); setElapsed(0); setLoop((l) => l + 1); interact('scene'); reach(i); };
  const toggle = () => { interact(playing ? 'pause' : 'play'); setPlaying((p) => !p); };

  // Con movimiento reducido cada escena se ve completa (sin coreografía interna).
  const t = reduced ? Number.POSITIVE_INFINITY : elapsed;
  const at = (s: number, ms: number) => scene > s || (scene === s && t >= ms);

  const typed = scene > 0 || t >= typeEnd ? script.message : script.message.slice(0, Math.max(0, Math.floor((t - TYPE_START) / TYPE_MS)));
  const sent = at(0, typeEnd + 250);

  // La conversación "se desplaza": todo existe desde el inicio (sin saltos de layout) y lo que aún no aparece
  // empuja la pila hacia abajo, fuera de la pantalla.
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [heights, setHeights] = useState([0, 0, 0, 0]);
  useLayoutEffect(() => {
    const measure = () => setHeights(itemRefs.current.map((el) => el?.offsetHeight ?? 0));
    measure();
    const ro = new ResizeObserver(measure);
    itemRefs.current.forEach((el) => el && ro.observe(el));
    return () => ro.disconnect();
  }, []);
  const revealed = [sent, at(1, 200), at(1, 1500), at(2, 300)];
  const offset = revealed.reduce((sum, r, i) => (r ? sum : sum + heights[i]! + GAP), 0);

  const thinking = scene === 1 && !at(1, 1000);
  const chosen = at(1, 3000);
  const screen = scene <= 2 ? 'chat' : scene === 3 ? 'player' : 'result';
  const cue = script.playing.cue[Math.floor((Number.isFinite(t) ? t : 0) / (BREATH_MS / 2)) % 2]!;
  const dark = tone === 'dark';

  return (
    <div ref={rootRef} className={cn('film flex flex-col items-center gap-5', className)} data-paused={running || reduced ? undefined : ''}>
      {/* ---------- El teléfono (decorativo) ---------- */}
      <div aria-hidden="true" className={cn('relative h-[560px] w-[300px] max-w-full shrink-0 rounded-[44px] p-2.5 shadow-raised', dark ? 'bg-[#1B1B1A] ring-1 ring-white/15' : 'bg-soi-ink')}>
        <div className="relative h-full overflow-hidden rounded-[34px] bg-white text-soi-ink">
          {/* Chat */}
          <div className={cn('absolute inset-0 flex flex-col transition-[opacity,transform] duration-500 ease-out-strong', screen === 'chat' ? 'opacity-100' : 'pointer-events-none scale-[0.97] opacity-0')}>
            <div className="flex h-12 shrink-0 items-center justify-between px-5 pt-1">
              <span className="text-[17px] font-semibold">SOI.</span>
              <span className="h-7 w-7 rounded-full bg-soi-tray" />
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_40px)]">
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 px-4 pb-3 transition-transform duration-[550ms] ease-in-out-strong" style={{ transform: `translateY(${offset}px)` }}>
                <div ref={(el) => { itemRefs.current[0] = el; }} className={cn('ml-auto max-w-[85%] rounded-[16px] bg-soi-tray px-3.5 py-2.5 text-[13.5px] leading-snug transition-opacity duration-300', revealed[0] ? 'opacity-100' : 'opacity-0')}>
                  {script.message}
                </div>
                <div ref={(el) => { itemRefs.current[1] = el; }} className={cn('max-w-[92%] text-[13.5px] leading-snug transition-opacity duration-300', revealed[1] ? 'opacity-100' : 'opacity-0')}>
                  {thinking ? (
                    <span className="flex gap-1 py-1.5">
                      {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-thinking rounded-full bg-soi-subtle" style={{ animationDelay: `${i * 180}ms` }} />)}
                    </span>
                  ) : (
                    <p key={`r${loop}`} className="film-in">{script.reply}</p>
                  )}
                </div>
                <div ref={(el) => { itemRefs.current[2] = el; }} className={cn('flex flex-wrap gap-1.5 transition-opacity duration-300', revealed[2] ? 'opacity-100' : 'opacity-0')}>
                  {script.chips.map((c) => {
                    const on = c === script.chip;
                    return (
                      <span key={c} className={cn('rounded-full px-3 py-1.5 text-[12.5px] transition-[background-color,color,opacity,transform] duration-200',
                        chosen && on ? 'scale-[0.97] bg-soi-ink text-white' : 'bg-white shadow-ring',
                        chosen && !on && 'opacity-40')}>{c}</span>
                    );
                  })}
                </div>
                <div ref={(el) => { itemRefs.current[3] = el; }} className={cn('rounded-[20px] bg-soi-tray p-1.5 transition-opacity duration-300', revealed[3] ? 'opacity-100' : 'opacity-0')}>
                  <div className="rounded-[15px] bg-white p-3 shadow-ring">
                    <p className="flex items-center gap-1.5 text-[11.5px] text-soi-muted"><Sparkles className="h-3.5 w-3.5 shrink-0 text-soi-accent" /><span className="nums">Preparé un Moment de {script.minutes} minutos</span></p>
                    <p className="mt-1 text-[15px] font-semibold leading-tight">{script.momentTitle}</p>
                    <ul className="mt-2.5 flex flex-col gap-1.5">
                      {script.blocks.map((b, i) => {
                        const Icon = ICONS[b.icon];
                        const on = at(2, 900 + i * 380);
                        return (
                          <li key={b.label} className={cn('flex items-center gap-2 transition-[opacity,transform] duration-300 ease-out-strong', on ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0')}>
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-soi-accent-soft text-soi-accent"><Icon className="h-3.5 w-3.5" /></span>
                            <span className="line-clamp-2 min-w-0 flex-1 text-[12.5px] leading-tight">{b.label}</span>
                            <span className="nums text-[11.5px] text-soi-muted">{b.minutes} min</span>
                          </li>
                        );
                      })}
                    </ul>
                    <span className={cn('mt-3 flex h-9 items-center justify-center gap-1.5 rounded-lg bg-soi-ink text-[13px] font-medium text-white transition-transform duration-150 ease-out-strong', at(2, 4700) && 'scale-[0.97]')}>
                      <Play className="h-3.5 w-3.5" />Comenzar
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="shrink-0 px-3 pb-3">
              <div className="flex items-end gap-2 rounded-[20px] bg-white p-2 shadow-ring">
                <span className={cn('min-h-8 flex-1 px-1.5 py-1.5 text-[13px] leading-snug', sent || !typed ? 'text-soi-subtle' : 'text-soi-ink')}>
                  {sent || !typed ? 'Cuéntame lo que traes…' : <>{typed}<span className="ml-px inline-block h-3.5 w-px translate-y-0.5 animate-thinking bg-soi-ink" /></>}
                </span>
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white transition-[transform,background-color] duration-150 ease-out-strong',
                  !sent && typed.length === script.message.length ? 'scale-[0.94] bg-soi-ink' : typed && !sent ? 'bg-soi-ink' : 'bg-soi-subtle/50')}>
                  <ArrowUp className="h-4 w-4" />
                </span>
              </div>
            </div>
          </div>

          {/* Reproductor */}
          <div className={cn('absolute inset-0 flex flex-col px-5 pb-6 pt-4 transition-[opacity,transform] duration-500 ease-out-strong', screen === 'player' ? 'opacity-100' : 'pointer-events-none scale-[1.02] opacity-0')}>
            <div className="flex items-center justify-between text-soi-muted">
              <X className="h-4 w-4" />
              <span className="truncate px-3 text-[12px]">{script.momentTitle}</span>
              <span className="w-4" />
            </div>
            <div className="mt-3 flex gap-1">
              {script.blocks.map((b, i) => (
                <span key={b.label} className="h-1 flex-1 overflow-hidden rounded-full bg-soi-tray">
                  {i === 0 && scene === 3 && <span key={`p${loop}`} className="block h-full origin-left rounded-full bg-soi-accent" style={{ animation: `film-fill ${durations[3]}ms linear both` }} />}
                </span>
              ))}
            </div>
            <p className="nums mt-6 text-center text-[11.5px] text-soi-muted">Paso 1 de {script.blocks.length}</p>
            <p className="mt-1 text-center text-[17px] font-semibold">{script.playing.label}</p>
            <div className="relative mx-auto mt-6 grid h-48 w-48 place-items-center">
              {screen === 'player' && (
                <span key={`h${loop}`} data-breath-halo className="absolute inset-0 rounded-full bg-soi-accent-soft" style={{ animation: `film-breathe ${BREATH_MS}ms var(--ease-in-out-strong) infinite` }} />
              )}
              <span className="relative grid h-32 w-32 place-items-center rounded-full bg-white ring-[2.5px] ring-soi-accent">
                <span key={cue} className="film-in px-3 text-center text-[14px] font-medium text-soi-accent">{cue}</span>
              </span>
            </div>
            <div className="mt-auto flex items-center justify-center gap-2 text-[12px] text-soi-muted">
              <Volume2 className="h-4 w-4 text-soi-accent" />
              Voz guía
              <span className="flex h-3.5 items-center gap-[3px]">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="film-voice-bar h-full w-[3px] origin-center rounded-full bg-soi-accent" style={{ animation: `film-voice 900ms var(--ease-in-out-strong) ${i * 140}ms infinite` }} />
                ))}
              </span>
            </div>
          </div>

          {/* Resultado */}
          <div className={cn('absolute inset-0 flex flex-col px-5 pb-6 pt-10 transition-[opacity,transform] duration-500 ease-out-strong', screen === 'result' ? 'opacity-100' : 'pointer-events-none scale-[1.02] opacity-0')}>
            {screen === 'result' && (
              <div key={`res${loop}`} className="flex flex-1 flex-col">
                <p className="text-center text-[17px] font-semibold">¿Cómo te sientes ahora?</p>
                <div className="mt-6 flex flex-col gap-3 text-[12px]">
                  {[{ k: 'Antes', v: script.moodBefore, grow: false }, { k: 'Ahora', v: script.moodAfter, grow: true }].map((m) => (
                    <div key={m.k}>
                      <div className="flex justify-between text-soi-muted"><span>{m.k}</span><span className="nums">{m.v}/10</span></div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-soi-tray">
                        <div className={cn('h-full origin-left rounded-full', m.grow ? 'bg-soi-accent' : 'bg-soi-subtle/60')}
                          style={{ width: `${m.v * 10}%`, ...(m.grow ? { ['--from' as string]: script.moodBefore / script.moodAfter, animation: 'film-grow 900ms var(--ease-out-strong) 400ms backwards' } : {}) }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-5 flex justify-center gap-2">
                  {['Me ayudó', 'No del todo'].map((c, i) => (
                    <span key={c} className={cn('rounded-full px-3.5 py-1.5 text-[12.5px] transition-[background-color,color,opacity,transform] duration-200',
                      at(4, 1700) && i === 0 ? 'scale-[0.97] bg-soi-ink text-white' : 'bg-white shadow-ring', at(4, 1700) && i === 1 && 'opacity-40')}>{c}</span>
                  ))}
                </div>
                {at(4, 2500) && (
                  <div className="film-in relative mt-auto">
                    <span className="absolute inset-0 animate-celebrate rounded-[20px] ring-2 ring-soi-gold" />
                    <div className="relative rounded-[20px] bg-soi-ink p-4 text-white">
                      <p className="text-[11.5px] text-white/70">Acabas de fortalecer quién eres</p>
                      <p className="mt-1 flex items-center gap-2 text-[18px] font-semibold"><span className="h-2 w-2 rounded-full bg-soi-gold" />{script.capacity}</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full w-3/5 origin-left rounded-full bg-white" style={{ ['--from' as string]: 0.4, animation: 'film-grow 700ms var(--ease-out-strong) 250ms backwards' }} />
                      </div>
                      <p className="nums mt-2 text-[11.5px] text-soi-gold">+1 evidencia · Nivel 2</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ---------- Leyenda y controles ---------- */}
      <div className="w-full max-w-[340px]">
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggle} aria-label={playing ? 'Pausar la animación' : 'Reproducir la animación'}
            className={cn('press grid h-11 w-11 shrink-0 place-items-center rounded-full', dark ? 'text-white ring-1 ring-white/20 hover:bg-white/10' : 'text-soi-ink shadow-ring hover:bg-soi-tray')}>
            {playing ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Play className="h-4 w-4" aria-hidden="true" />}
          </button>
          <div className="flex flex-1 gap-1.5">
            {SCENES.map((s, i) => (
              <button key={s.title} type="button" onClick={() => goTo(i)} aria-label={`Escena ${i + 1}: ${s.title}`} aria-current={i === scene ? 'step' : undefined}
                className="group flex h-11 flex-1 items-center">
                <span className={cn('block h-1 w-full overflow-hidden rounded-full', dark ? 'bg-white/20' : 'bg-black/10')}>
                  {i < scene && <span className={cn('block h-full w-full rounded-full', dark ? 'bg-white' : 'bg-soi-ink')} />}
                  {i === scene && (
                    <span key={`s${loop}`} className={cn('block h-full w-full origin-left rounded-full', dark ? 'bg-white' : 'bg-soi-ink')}
                      style={{ animation: `film-fill ${durations[i]}ms linear both` }} />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="mt-2 min-h-[4.5rem] px-1" aria-hidden="true">
          <p className={cn('nums text-xs font-medium', dark ? 'text-soi-gold' : 'text-soi-accent')}>0{scene + 1}</p>
          <p key={`t${loop}`} className={cn('film-in text-lg font-semibold leading-snug', dark && 'text-white')}>{SCENES[scene]!.title}</p>
          <p className={cn('text-sm', dark ? 'text-white/70' : 'text-soi-muted')}>{SCENES[scene]!.line}</p>
        </div>
      </div>

      {/* Guion completo para lectores de pantalla. */}
      <ol className="sr-only">
        <li>{SCENES[0].title}: «{script.message}»</li>
        <li>{SCENES[1].title}: «{script.reply}» Respuesta elegida: {script.chip}.</li>
        <li>{SCENES[2].title}: «{script.momentTitle}», {script.minutes} minutos: {script.blocks.map((b) => `${b.label} (${b.minutes} min)`).join(', ')}.</li>
        <li>{SCENES[3].title}: {script.playing.label}.</li>
        <li>{SCENES[4].title}: ánimo de {script.moodBefore} a {script.moodAfter} de 10; fortaleces {script.capacity}.</li>
      </ol>
    </div>
  );
}
