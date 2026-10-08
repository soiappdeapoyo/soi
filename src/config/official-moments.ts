import { ROUTINES, type RoutineId } from '@/config/routines';
import type { ActionBlock, MomentKind } from '@/config/actions';
import { officialCover, type MomentFlow } from '@/lib/moments/types';

/**
 * Moments oficiales de SOI: las rutinas del marco teórico convertidas en flujos ejecutables.
 * El contenido sigue viniendo de ROUTINES (fuente de verdad, cita autor y obra — Regla #8).
 */
type StepMap = Record<string, (label: string, quote?: string) => Pick<ActionBlock, 'type' | 'config'>>;

const timer = (label: string) => ({ type: 'timer' as const, config: { instruction: label } });

const MAPS: Record<RoutineId, StepMap> = {
  brian_tracy_5min: {
    wake: timer,
    say: (_l, q) => ({ type: 'affirmation', config: { text: q ?? 'Hoy va a ser el mejor día de todos.', repeat: 1 } }),
    write_top: (l) => ({ type: 'writing', config: { prompt: l } }),
    write_day: (l) => ({ type: 'writing', config: { prompt: l } }),
    thank: (_l, q) => ({ type: 'affirmation', config: { text: q ?? 'Gracias.', repeat: 1 } }),
  },
  miracle_morning: {
    silence: (l) => ({ type: 'meditation', config: { guide: l } }),
    affirmations: (l) => ({ type: 'writing', config: { prompt: `${l} Escríbelas en presente.` } }),
    visualization: (l) => ({ type: 'visualization', config: { scene: l } }),
    exercise: timer,
    reading: (l) => ({ type: 'reading', config: { book: l } }),
    scribing: (l) => ({ type: 'writing', config: { prompt: l } }),
  },
  five_am_club: {
    move: timer,
    reflect: (l) => ({ type: 'meditation', config: { guide: l } }),
    grow: (l) => ({ type: 'reading', config: { book: l } }),
  },
  dispenza_protocol: {
    morning: (l) => ({ type: 'meditation', config: { guide: l } }),
    afternoon: (l) => ({ type: 'walk', config: { instruction: l } }),
    evening: () => ({ type: 'gratitude', config: { count: 3 } }),
  },
  cierre_del_dia: {
    breathe: () => ({ type: 'breathing', config: { pattern: 'calma' } }),
    victory: (l) => ({ type: 'reflection', config: { question: l } }),
    learning: (l) => ({ type: 'reflection', config: { question: l } }),
    gratitude: () => ({ type: 'gratitude', config: { count: 3 } }),
    tomorrow: (l) => ({ type: 'writing', config: { prompt: l } }),
    sats: (l) => ({ type: 'visualization', config: { scene: l } }),
  },
  neville_sats: {
    relax: (l) => ({ type: 'meditation', config: { guide: l } }),
    scene: (l) => ({ type: 'visualization', config: { scene: l } }),
    sleep: (l) => ({ type: 'visualization', config: { scene: l } }),
  },
};

const KIND: Record<RoutineId, MomentKind> = {
  brian_tracy_5min: 'daily', miracle_morning: 'daily', five_am_club: 'daily', dispenza_protocol: 'daily', neville_sats: 'recovery',
  cierre_del_dia: 'daily',
};

const OBJECTIVE: Record<RoutineId, string> = {
  brian_tracy_5min: 'Empezar el día programando tu mente con una intención escrita.',
  miracle_morning: 'Una mañana completa para tu mente, tu cuerpo y tu claridad.',
  five_am_club: 'Moverte, reflexionar y crecer antes de que empiece el ruido.',
  dispenza_protocol: 'Soltar el pasado y reconectar contigo a lo largo del día.',
  neville_sats: 'Dormirte sintiendo el deseo ya cumplido.',
  cierre_del_dia: 'Reconocer tu día, quedarte con lo que te enseñó y dejar listo el mañana antes de dormir.',
};

function build(id: RoutineId): MomentFlow {
  const r = ROUTINES[id];
  const blocks: ActionBlock[] = r.steps.map((s) => {
    const mapped = (MAPS[id][s.id] ?? timer)(s.label, 'quote' in s ? s.quote : undefined);
    const seconds = 'seconds' in s ? s.seconds : undefined;
    return {
      id: s.id,
      type: mapped.type,
      title: s.label.split(':')[0]!.slice(0, 120),
      minutes: 'minutes' in s && s.minutes ? s.minutes : Math.max(1, Math.round((seconds ?? 60) / 60)),
      ...(seconds ? { seconds } : {}),
      source: 'source' in s && s.source ? s.source : `${r.author} — ${r.source}`,
      config: mapped.config as Record<string, unknown>,
    };
  });
  return {
    id, slug: id, official: true, creator_id: null, author: r.author,
    title: r.label, objective: OBJECTIVE[id], kind: KIND[id], eslabon: r.eslabon,
    blocks, source: `${r.author} — ${r.source}`, required_minutes: r.totalMinutes, duration_days: 1,
    tier: 'free', price_cents: 0, currency: 'usd', status: 'published', version: 1,
    parent_id: null, parent_slug: null, executions_count: 0, forks_count: 0,
    implementations_count: 0, completions_count: 0, is_demo: false, created_at: '2026-01-01T00:00:00.000Z',
    cover: officialCover(id),
  };
}

export const OFFICIAL_MOMENTS: MomentFlow[] = (Object.keys(ROUTINES) as RoutineId[]).map(build);

export function officialMoment(slug: string): MomentFlow | null {
  return OFFICIAL_MOMENTS.find((m) => m.slug === slug) ?? null;
}
