import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { CAPACITIES, levelFor, type Capacity } from '@/config/capacities';
import { resolveRefs } from '@/lib/day-plan';
import { loadHillMemory } from '@/lib/ai/hill-memory';
import { dateInTz } from '@/lib/utils';
import { classifyLinks, loadLinks, type IdentityRow, type Link, type LinkItem } from './classify';

export type EvidenceKind = 'moment' | 'reflexion' | 'logro' | 'regreso';
export type Evidence = { id: string; kind: EvidenceKind; title: string; note: string | null; at: string; identityIds: string[]; capacities: Capacity[]; weight: number };
export type IdentityStat = IdentityRow & { xp: number; evidenceCount: number; level: ReturnType<typeof levelFor> };
export type CapacityStat = { name: Capacity; xp: number; level: ReturnType<typeof levelFor> };
export type StoryEvent = { at: string; text: string };

type Run = { moment_id: string | null; moment_slug: string | null; started_at: string; completed_at: string | null; learning: string | null };

const DAY = 86_400_000;
const refOf = (r: Pick<Run, 'moment_id' | 'moment_slug'>) => (r.moment_id ? `m:${r.moment_id}` : `s:${r.moment_slug}`);
const quote = (t: string, max = 110) => { const s = t.trim().replace(/\s+/g, ' '); return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s; };

/** Regresos: volver a practicar después de 2+ días sin hacerlo ("recaída superada"). */
export function comebacks(dates: string[], timeZone: string): { at: string; gap: number }[] {
  const days = [...new Set(dates.map((d) => dateInTz(d, timeZone)))].sort();
  const out: { at: string; gap: number }[] = [];
  for (let i = 1; i < days.length; i++) {
    const gap = Math.round((Date.parse(days[i]!) - Date.parse(days[i - 1]!)) / DAY);
    if (gap >= 3) out.push({ at: `${days[i]}T12:00:00.000Z`, gap: gap - 1 });
  }
  return out;
}

/**
 * "SOI ha observado que…": compara los últimos 30 días con los 30 anteriores. Solo muestra mejoras reales
 * (con datos suficientes en ambos periodos); nunca motivación genérica.
 */
export function observe(runs: Run[], timeZone: string, now = Date.now()): string[] {
  const inWindow = (r: Run, from: number, to: number) => { const t = Date.parse(r.started_at); return t >= now - from * DAY && t < now - to * DAY; };
  const recent = runs.filter((r) => inWindow(r, 30, 0));
  const prior = runs.filter((r) => inWindow(r, 60, 30));
  if (recent.length < 3 || prior.length < 3) return [];
  const rate = (xs: Run[], f: (r: Run) => boolean) => xs.filter(f).length / Math.max(1, xs.length);
  const out: string[] = [];
  const done = (r: Run) => Boolean(r.completed_at);
  const reflected = (r: Run) => Boolean(r.learning && r.learning.trim().length >= 6);
  if (rate(recent, done) > rate(prior, done) + 0.1) out.push('Terminas más de lo que empiezas: abandonas menos tus Moments.');
  if (rate(recent.filter(done), reflected) > rate(prior.filter(done), reflected) + 0.1) out.push('Reflexionas más: después de actuar, te detienes a escribir qué funcionó.');
  const activeDays = (xs: Run[]) => new Set(xs.filter(done).map((r) => dateInTz(r.completed_at!, timeZone))).size;
  if (activeDays(recent) > activeDays(prior)) out.push(`Practicas más días: ${activeDays(recent)} en el último mes, frente a ${activeDays(prior)} el mes anterior.`);
  const gaps = (xs: Run[]) => comebacks(xs.filter(done).map((r) => r.completed_at!), timeZone).map((c) => c.gap);
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const gr = avg(gaps(recent)); const gp = avg(gaps(prior));
  if (gr !== null && gp !== null && gr < gp) out.push('Vuelves antes a tu rutina cuando te desvías.');
  return out;
}

/** Todo lo de "Mi Nuevo Yo": visión, identidades con nivel, capacidades, evidencias, observaciones e historia. */
export async function loadIdentityView(supabase: SupabaseClient, userId: string, profile: UserProfile | null, timeZone: string) {
  const [{ data: idRows }, { data: rawRuns }, { data: muro }, hill, links] = await Promise.all([
    supabase.from('identities').select('id, name, description, capacities, status, position, created_at').eq('user_id', userId)
      .neq('status', 'archived').order('position').order('created_at'),
    supabase.from('moment_runs').select('moment_id, moment_slug, started_at, completed_at, learning').eq('user_id', userId)
      .order('started_at', { ascending: false }).limit(1000),
    supabase.from('agent_knowledge').select('id, title, content, created_at').eq('user_id', userId).eq('category', 'evidencia')
      .order('created_at', { ascending: false }).limit(300),
    loadHillMemory(supabase, userId).catch(() => ({ id: null, memory: null })),
    loadLinks(supabase, userId),
  ]);
  const identities = (idRows ?? []) as IdentityRow[];
  const active = identities.filter((i) => i.status === 'active');
  const runs = (rawRuns ?? []) as Run[];
  const done = runs.filter((r) => r.completed_at);
  const muroRows = (muro ?? []) as { id: string; title: string; content: string; created_at: string }[];

  // Conectar lo que aún no tiene vínculo (una llamada de IA para todo lo pendiente; reglas como respaldo).
  const runRefs = [...new Set(done.map(refOf))];
  const moments = await resolveRefs(supabase, runRefs.filter((r) => !links.has(r)).slice(0, 20));
  const pending: LinkItem[] = [
    ...runRefs.filter((r) => !links.has(r) && moments.has(r)).map((r) => {
      const m = moments.get(r)!;
      return { ref: r, title: m.title, text: m.objective, kind: m.kind, types: m.blocks.map((b) => b.type) };
    }),
    ...muroRows.filter((e) => !links.has(`e:${e.id}`)).map((e) => ({ ref: `e:${e.id}`, title: e.title, text: e.content })),
  ].slice(0, 20);
  if (pending.length && active.length) for (const l of await classifyLinks(userId, active, pending)) links.set(l.ref, l);

  const titles = await resolveRefs(supabase, runRefs);
  const evidence: Evidence[] = [];
  for (const r of done) {
    const link: Link | undefined = links.get(refOf(r));
    const title = titles.get(refOf(r))?.title ?? 'Moment';
    const reflected = Boolean(r.learning && r.learning.trim().length >= 6);
    evidence.push({
      id: `${refOf(r)}@${r.completed_at}`, kind: reflected ? 'reflexion' : 'moment', title, note: reflected ? r.learning : null,
      at: r.completed_at!, identityIds: link?.identity_ids ?? [], capacities: link?.capacities ?? [], weight: reflected ? 2 : 1,
    });
  }
  for (const e of muroRows) {
    const link = links.get(`e:${e.id}`);
    evidence.push({ id: `e:${e.id}`, kind: 'logro', title: e.title, note: e.content?.slice(0, 200) ?? null, at: e.created_at, identityIds: link?.identity_ids ?? [], capacities: link?.capacities ?? [], weight: 2 });
  }
  for (const c of comebacks(done.map((r) => r.completed_at!), timeZone)) {
    evidence.push({
      id: `back@${c.at}`, kind: 'regreso', title: `Volviste después de ${c.gap} ${c.gap === 1 ? 'día' : 'días'}`, note: null, at: c.at,
      identityIds: active.filter((i) => i.capacities.includes('Constancia') || i.capacities.includes('Disciplina')).map((i) => i.id),
      capacities: ['Constancia'], weight: 1,
    });
  }
  evidence.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const idStats: IdentityStat[] = identities.map((i) => {
    const mine = evidence.filter((e) => e.identityIds.includes(i.id));
    const xp = mine.reduce((a, e) => a + e.weight, 0);
    return { ...i, xp, evidenceCount: mine.length, level: levelFor(xp) };
  });
  const capStats: CapacityStat[] = CAPACITIES.map((name) => {
    const xp = evidence.filter((e) => e.capacities.includes(name)).reduce((a, e) => a + e.weight, 0);
    return { name, xp, level: levelFor(xp) };
  }).filter((c) => c.xp > 0).sort((a, b) => b.xp - a.xp);

  // Tu historia (con datos reales): de dónde partiste y dónde estás.
  const story: StoryEvent[] = [];
  const firstRun = done[done.length - 1];
  if (firstRun) story.push({ at: firstRun.completed_at!, text: `Viviste tu primer Moment: «${titles.get(refOf(firstRun))?.title ?? 'Moment'}».` });
  const reflections = done.filter((r) => r.learning && r.learning.trim().length >= 6);
  const firstRefl = reflections[reflections.length - 1];
  if (firstRefl) story.push({ at: firstRefl.completed_at!, text: `Tu primera reflexión: «${quote(firstRefl.learning!)}».` });
  for (const i of active) story.push({ at: i.created_at, text: `Decidiste convertirte en «${i.name}».` });
  const h = hill.memory;
  if (h?.definite_chief_aim) {
    const since = h.updated_at ?? new Date().toISOString();
    const reinforced = evidence.filter((e) => Date.parse(e.at) >= Date.parse(since) && e.identityIds.length).length;
    story.push({
      at: since,
      text: `Definiste tu propósito: «${quote(h.definite_chief_aim, 140)}»${h.target ? ` · ${quote(h.target, 60)}` : ''}${h.deadline ? ` · para ${quote(h.deadline, 40)}` : ''}.${reinforced ? ` Desde entonces lo has reforzado ${reinforced} ${reinforced === 1 ? 'vez' : 'veces'}.` : ''}`,
    });
  }
  const lastRefl = reflections[0];
  if (lastRefl && lastRefl !== firstRefl) story.push({ at: lastRefl.completed_at!, text: `Hoy escribes: «${quote(lastRefl.learning!)}».` });
  story.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

  return {
    vision: { aim: h?.definite_chief_aim ?? null, target: h?.target ?? null, deadline: h?.deadline ?? null, goals: profile?.goals ?? [] },
    identities: idStats,
    proposed: idStats.filter((i) => i.status === 'proposed'),
    active: idStats.filter((i) => i.status === 'active'),
    capacities: capStats,
    evidence,
    observations: observe(runs, timeZone),
    story,
  };
}

export type IdentityView = Awaited<ReturnType<typeof loadIdentityView>>;
