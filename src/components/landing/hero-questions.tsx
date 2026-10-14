'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Cada pregunta del héroe con la respuesta de SOI que va debajo. */
const PAIRS = [
  ['¿Guardas cientos de videos de motivación y sigues igual?', 'SOI convierte inspiración en acción. Transforma lo que aprendes en pasos diarios para avanzar.'],
  ['¿Sabes lo que tienes que hacer, pero no logras hacerlo?', 'SOI te ayuda a pasar del pensamiento a la acción con pequeñas decisiones diarias.'],
  ['¿Quieres cambiar tu vida, pero sigues siendo la misma persona?', 'SOI trabaja contigo para construir la identidad y hábitos de la persona que quieres ser.'],
  ['¿Cuántas veces dijiste “mañana empiezo”?', 'SOI convierte tus intenciones en compromisos diarios que puedes cumplir.'],
  ['¿Tienes sueños grandes pero una rutina pequeña?', 'SOI diseña contigo rutinas alineadas con tus objetivos y tu propósito.'],
  ['¿Consumes desarrollo personal pero no ves resultados?', 'SOI transforma conocimiento en experiencias, acciones y progreso medible.'],
  ['¿Y si tu problema no es falta de información, sino falta de identidad?', 'SOI te ayuda a trabajar desde quién eres hoy hacia quién necesitas convertirte.'],
  ['¿Quién serías si todos tus hábitos estuvieran alineados contigo?', 'SOI te acompaña a crear hábitos que reflejen la persona que quieres construir.'],
  ['¿Tu mente está creando la vida que realmente quieres?', 'SOI te ayuda a conectar pensamientos, emociones y acciones con tus objetivos.'],
  ['¿Qué pasaría si tuvieras un guía personal disponible todos los días?', 'SOI es tu acompañamiento inteligente para mantener claridad, enfoque y momentum.'],
] as const;

/** Tiempo de cada pregunta: ~3 s para que SOI escriba la respuesta y ~4 s para leerla completa. */
const HOLD_MS = 7000;
/** La respuesta empieza a escribirse cuando la pregunta ya llegó (200 ms de espera + 450 ms de entrada). */
const TYPE_START_MS = 550;
/** Por letra, y una pausa breve tras una coma o un punto, como quien escribe. */
const CHAR_MS = 26;
const PUNCT_MS = 160;

/**
 * Héroe de la landing: las preguntas rotan con su respuesta debajo.
 * - Todas se apilan en la misma celda de la cuadrícula: el alto es el de la más larga y el chat de abajo nunca salta.
 * - La que sale sube y se desvanece rápido (200 ms); la pregunta que entra llega completa desde abajo (450 ms) y la
 *   respuesta SOI la va escribiendo, como en el chat de abajo. El texto aún no escrito ocupa su lugar invisible, así
 *   que las líneas no se reacomodan mientras se escribe. La primera respuesta aparece completa (primera impresión
 *   inmediata). Con movimiento reducido: solo fundido, sin escritura.
 * - Lectores de pantalla y buscadores leen un título fijo; lo que rota es decorativo. Se puede pausar (WCAG 2.2.2) y se
 *   detiene con la pestaña oculta.
 */
export function HeroQuestions({ title }: { title: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  // Letras escritas de la respuesta activa (la primera, completa).
  const [typed, setTyped] = useState<number>(PAIRS[0][1].length);
  const shown = useRef(0); // la respuesta ya escrita (evita reescribir la primera al montar)

  // Antes de pintar: la respuesta nueva nunca se ve completa ni un cuadro antes de escribirse.
  useLayoutEffect(() => {
    if (shown.current === i) return;
    shown.current = i;
    const text = PAIRS[i]![1];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setTyped(text.length); return; }
    setTyped(0);
    let n = 0;
    let id = setTimeout(function tick() {
      n += 1;
      setTyped(n);
      if (n < text.length) id = setTimeout(tick, /[.,]/.test(text[n - 1]!) ? PUNCT_MS : CHAR_MS);
    }, TYPE_START_MS);
    return () => clearTimeout(id);
  }, [i]);

  useEffect(() => {
    if (paused) return;
    let id: ReturnType<typeof setInterval> | undefined;
    const start = () => { id = setInterval(() => setI((n) => (n + 1) % PAIRS.length), HOLD_MS); };
    const onVisibility = () => { clearInterval(id); if (document.visibilityState === 'visible') start(); };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisibility); };
  }, [paused]);

  const prev = (i - 1 + PAIRS.length) % PAIRS.length;
  // Activa: en su lugar. La que acaba de salir: arriba. Las demás esperan abajo (de ahí entran).
  const state = (n: number) => (n === i ? 'active' : n === prev ? 'gone' : 'waiting');
  const item = 'col-start-1 row-start-1 transition-[opacity,transform] ease-out-strong motion-reduce:!translate-y-0';
  const states = {
    active: 'opacity-100 translate-y-0 duration-[450ms]',
    gone: 'opacity-0 -translate-y-2 duration-200 delay-0',
    waiting: 'opacity-0 translate-y-3 duration-0 delay-0',
  } as const;

  return (
    <>
      <h1 className="sr-only">{title}</h1>
      <div aria-hidden="true" className="grid">
        {PAIRS.map(([q], n) => (
          <p key={n} className={cn(item, states[state(n)], state(n) === 'active' && 'delay-200',
            'self-end text-balance text-[2.1rem] font-black leading-[1.02] tracking-tight sm:text-[3.4rem]')}>
            {q}
          </p>
        ))}
      </div>
      <div aria-hidden="true" className="mx-auto mt-4 grid max-w-lg">
        {PAIRS.map(([, a], n) => (
          <p key={n} className={cn(item, states[state(n)], 'self-start text-pretty text-[17px] text-white/75 sm:text-lg')}>
            {n === i && typed < a.length ? (
              <>
                {a.slice(0, typed)}
                {/* Cursor sin ancho: no mueve el texto. */}
                <span className="relative"><span className="absolute -bottom-0.5 left-0 h-[1.15em] w-0.5 rounded-full bg-soi-gold" /></span>
                <span className="opacity-0">{a.slice(typed)}</span>
              </>
            ) : a}
          </p>
        ))}
      </div>
      <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused}
        aria-label={paused ? 'Reanudar las preguntas' : 'Pausar las preguntas'}
        className="press mx-auto mt-1 grid h-11 w-11 place-items-center rounded-full text-white/40 hover:text-white/80">
        {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
      </button>
    </>
  );
}
