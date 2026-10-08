import { z } from 'zod/v3';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { MomentKind } from '@/config/actions';
import { officialMoment, OFFICIAL_MOMENTS } from '@/config/official-moments';
import { MOMENT_FIELDS, toMomentFlow, type MomentFlow } from '@/lib/moments/types';
import { hourInTz, startOfTodayISO } from '@/lib/utils';

export type DayPart = 'manana' | 'tarde' | 'noche';
export const PART_LABEL: Record<DayPart, string> = { manana: 'mañana', tarde: 'tarde', noche: 'noche' };

export const DayItemSchema = z.object({
  id: z.string().min(1).max(40),
  ref: z.string().regex(/^(m:[0-9a-f-]{36}|s:[a-z0-9_]{2,60})$/),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
});
export const DayItemsSchema = z.array(DayItemSchema).max(20);
export type DayItem = z.infer<typeof DayItemSchema>;
export type DayItemView = DayItem & { moment: MomentFlow | null; done: boolean };

/** Mañana 5–12 · tarde 12–19 · noche 19–5 (hora local de la persona). */
export function partOfDay(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return 'manana';
  if (hour >= 12 && hour < 19) return 'tarde';
  return 'noche';
}

export function partOfTime(time?: string): DayPart | null {
  return time ? partOfDay(Number(time.slice(0, 2))) : null;
}

export const refOf = (m: Pick<MomentFlow, 'id' | 'official' | 'slug'>) => (m.official ? `s:${m.slug}` : `m:${m.id}`);

/**
 * Qué sugerir según la hora (los autores del marco SOI lo dicen así):
 * mañana → empezar con intención (Tracy, Elrod, Sharma, Dispenza mañana) · tarde → crecer o reconectar ·
 * noche → bajar el ritmo y sembrar (Neville SATS, gratitud, recuperación).
 */
export const PART_SUGGEST: Record<DayPart, { kinds: MomentKind[]; slugs: string[]; why: string }> = {
  manana: { kinds: ['daily', 'growth'], slugs: ['brian_tracy_5min', 'miracle_morning', 'five_am_club', 'dispenza_protocol'], why: 'Empieza el día con intención' },
  tarde: { kinds: ['growth', 'learning', 'recovery'], slugs: ['dispenza_protocol'], why: 'Un respiro para reconectar y seguir' },
  noche: { kinds: ['recovery', 'daily'], slugs: ['cierre_del_dia', 'neville_sats'], why: 'Cierra tu día y prepara tu descanso' },
};

/**
 * El siguiente Moment del plan: el primero sin hacer cuya hora ya llegó (o sin hora, en orden);
 * si todos los que tienen hora son futuros, el primero pendiente.
 */
export function nextPending(items: Pick<DayItemView, 'id' | 'time' | 'done'>[], hour: number, minute = 0): string | null {
  const now = hour * 60 + minute;
  const mins = (t?: string) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : null);
  const pending = items.filter((i) => !i.done);
  const due = pending.find((i) => { const m = mins(i.time); return m === null || m <= now + 15; });
  return (due ?? pending[0])?.id ?? null;
}

export async function resolveRefs(supabase: SupabaseClient, refs: string[]): Promise<Map<string, MomentFlow>> {
  const out = new Map<string, MomentFlow>();
  for (const r of refs) if (r.startsWith('s:')) { const m = officialMoment(r.slice(2)); if (m) out.set(r, m); }
  const ids = [...new Set(refs.filter((r) => r.startsWith('m:')).map((r) => r.slice(2)))];
  if (ids.length) {
    const { data } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS).in('id', ids).neq('status', 'archived');
    for (const m of (data ?? []).map(toMomentFlow)) out.set(`m:${m.id}`, m);
  }
  return out;
}

/** El plan del día con lo que ya se hizo HOY (medianoche local de la persona, no UTC). */
export async function loadDayPlan(supabase: SupabaseClient, userId: string, timeZone: string) {
  const [{ data: plan }, { data: runs }] = await Promise.all([
    supabase.from('day_plans').select('items').eq('user_id', userId).maybeSingle(),
    supabase.from('moment_runs').select('moment_id, moment_slug').eq('user_id', userId)
      .not('completed_at', 'is', null).gte('completed_at', startOfTodayISO(timeZone)),
  ]);
  const parsed = DayItemsSchema.safeParse(plan?.items ?? []);
  const items = parsed.success ? parsed.data : [];
  const done = new Set((runs ?? []).map((r) => (r.moment_id ? `m:${r.moment_id}` : `s:${r.moment_slug}`)));
  const byRef = await resolveRefs(supabase, items.map((i) => i.ref));
  const views: DayItemView[] = items.map((i) => ({ ...i, moment: byRef.get(i.ref) ?? null, done: done.has(i.ref) }))
    .filter((i) => i.moment);
  const hour = hourInTz(timeZone);
  return { items: views, part: partOfDay(hour), hour, next: nextPending(views, hour, new Date().getMinutes()) };
}

/** Sugerencias para esta parte del día que todavía no están en el plan: tuyas primero, luego oficiales. */
export async function suggestForPart(supabase: SupabaseClient, userId: string, part: DayPart, exclude: Set<string>, limit = 4): Promise<MomentFlow[]> {
  const cfg = PART_SUGGEST[part];
  const { data } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', userId)
    .neq('status', 'archived').in('kind', cfg.kinds).order('updated_at', { ascending: false }).limit(8);
  const own = (data ?? []).map(toMomentFlow);
  const officials = cfg.slugs.map((s) => OFFICIAL_MOMENTS.find((m) => m.slug === s)).filter(Boolean) as MomentFlow[];
  const seen = new Set<string>();
  return [...own, ...officials].filter((m) => {
    const r = refOf(m);
    if (exclude.has(r) || seen.has(r)) return false;
    seen.add(r);
    return true;
  }).slice(0, limit);
}

/** Ruta del reproductor en modo "lista de Hoy". */
export const playHref = (m: Pick<MomentFlow, 'id' | 'official' | 'slug'>, auto = false) =>
  `/m/${m.official ? m.slug : m.id}/play?lista=hoy${auto ? '&auto=1' : ''}`;

/**
 * La lista de reproducción de Hoy: lo pendiente de Mi día, en su orden. Al estar en `currentRef`, el siguiente es
 * el próximo pendiente después de él (y si no hay, el primero pendiente antes: nada queda sin vivir).
 */
export function playQueue(items: Pick<DayItemView, 'ref' | 'done' | 'moment'>[], currentRef: string) {
  const idx = items.findIndex((i) => i.ref === currentRef);
  if (idx < 0) return null;
  const pending = (i: Pick<DayItemView, 'ref' | 'done'>) => !i.done && i.ref !== currentRef;
  const after = items.slice(idx + 1).find(pending) ?? items.slice(0, idx).find(pending) ?? null;
  return {
    position: items.filter((i) => i.done).length + 1,
    total: items.length,
    next: after?.moment ? { href: playHref(after.moment, true), title: after.moment.title, minutes: after.moment.required_minutes } : null,
  };
}
