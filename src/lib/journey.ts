/**
 * El loop principal de SOI: cuéntale cómo llegas → vive tu primer Moment → cuéntale cómo te fue → Hoy.
 * Una sola fuente de verdad del SIGUIENTE PASO (puro y testeado): Hoy, el chat, la pantalla final del Moment
 * y el inicio de sesión leen esta función, para que la persona siempre sepa qué sigue y nunca vea dos caminos.
 */

export type JourneyState = {
  /** Mensajes que la persona ha escrito a SOI (en cualquier conversación). */
  userMessages: number;
  /** Moments que terminó (alguna vez). */
  completedRuns: number;
  /** El primer Moment que terminó: para el seguimiento ("¿cómo te fue?"). */
  firstCompleted: { runId: string; completedAt: string } | null;
  /** Escribió a SOI después de terminar su primer Moment. */
  followedUp: boolean;
  /** Un Moment que SOI le preparó y todavía no vive (de los últimos días). */
  proposal: { id: string; title: string; minutes: number; href: string } | null;
  /** Un Moment que dejó a medias (se retoma donde quedó). */
  unfinished: { title: string; href: string; progress: number } | null;
  /** Puede ejecutar Moments (prueba o SOI+). */
  canRun: boolean;
};

export type StepKind = 'resume' | 'talk' | 'keep_talking' | 'first_moment' | 'follow_up' | 'routine';

export type NextStep = {
  kind: StepKind;
  /** Lo que se le dice a la persona (una frase). */
  title: string;
  detail: string;
  cta: string;
  href: string;
  progress?: number;
};

/** Los primeros pasos visibles (checklist de bienvenida). */
export const FIRST_STEPS = [
  { id: 'talk', label: 'Cuéntale a SOI cómo llegas' },
  { id: 'moment', label: 'Vive tu primer Moment' },
  { id: 'follow_up', label: 'Cuéntale cómo te fue' },
] as const;
export type FirstStepId = (typeof FIRST_STEPS)[number]['id'];

/** El seguimiento del primer Moment se ofrece durante una semana; después ya no tiene sentido preguntar. */
export const FOLLOW_UP_WINDOW_MS = 7 * 86_400_000;

export function nextStep(s: JourneyState, now = Date.now()): NextStep {
  // 1) Lo que quedó a medias va antes que cualquier cosa nueva.
  if (s.unfinished && s.canRun) {
    return {
      kind: 'resume', title: `Lo dejaste a medias: «${s.unfinished.title}»`, detail: `Llevas ${s.unfinished.progress} %. Sigue justo donde te quedaste.`,
      cta: 'Retomar donde lo dejé', href: s.unfinished.href, progress: s.unfinished.progress,
    };
  }
  // 2) Primeros pasos: todavía no vive su primer Moment.
  if (s.completedRuns === 0) {
    if (s.proposal && s.canRun) {
      return {
        kind: 'first_moment', title: `Tu primer Moment está listo: «${s.proposal.title}»`, detail: `${s.proposal.minutes} min, guiado por voz. Una cosa a la vez.`,
        cta: 'Vivir mi primer Moment', href: s.proposal.href,
      };
    }
    if (s.userMessages === 0) {
      return {
        kind: 'talk', title: 'Empecemos por ti', detail: 'Cuéntale a SOI cómo llegas hoy. Con eso prepara tu primer Moment, hecho para ti.',
        cta: 'Empezar a conversar', href: '/chat?nueva=1',
      };
    }
    return {
      kind: 'keep_talking', title: 'Ya casi: tu primer Moment', detail: s.canRun ? 'Sigue la conversación con SOI. En un par de mensajes te prepara algo de pocos minutos.' : 'Sigue la conversación con SOI: te escucha y te acompaña.',
      cta: 'Seguir con SOI', href: '/chat',
    };
  }
  // 3) Vivió su primer Moment: cerrar con la conversación de seguimiento (una sola vez, la primera semana).
  if (!s.followedUp && s.firstCompleted && now - Date.parse(s.firstCompleted.completedAt) < FOLLOW_UP_WINDOW_MS) {
    return {
      kind: 'follow_up', title: 'Cuéntale a SOI cómo te fue', detail: 'Con lo que le cuentes aprende qué te ayuda y prepara mejor lo siguiente.',
      cta: 'Contarle cómo me fue', href: `/chat?nueva=1&run=${s.firstCompleted.runId}`,
    };
  }
  // 4) Ya tiene su ritmo: Hoy decide (su día, el ritual, lo que SOI propone).
  return { kind: 'routine', title: '', detail: '', cta: 'Ir a Hoy', href: '/hoy' };
}

/** En qué punto de los primeros pasos va (null cuando ya los completó: la bienvenida desaparece). */
export function firstStepsProgress(s: JourneyState, now = Date.now()): { done: FirstStepId[]; current: FirstStepId } | null {
  const step = nextStep({ ...s, unfinished: null }, now);
  if (step.kind === 'routine') return null;
  const current: FirstStepId = step.kind === 'follow_up' ? 'follow_up' : step.kind === 'first_moment' || step.kind === 'keep_talking' ? 'moment' : 'talk';
  const order = FIRST_STEPS.map((f) => f.id);
  return { done: order.slice(0, order.indexOf(current)), current };
}

/** ¿Es su primera vez de verdad? (sin mensajes ni Moments): después del login va directo a conversar con SOI. */
export const isBrandNew = (s: Pick<JourneyState, 'userMessages' | 'completedRuns'>) => s.userMessages === 0 && s.completedRuns === 0;
