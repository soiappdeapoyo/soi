import type { SupabaseClient } from '@supabase/supabase-js';
import { remember } from '@/lib/ai/rag';
import { scheduleAutoCover } from '@/lib/moments/auto-cover';
import {
  BELIEF_TAG, MAX_ACTIVE_BELIEFS, addPractice, applyBeliefInput, beliefMetadata, beliefMomentBlocks, beliefStage, findSimilar, readBelief,
  type Belief, type BeliefInputT, type BeliefPractice,
} from '@/lib/beliefs';

type Row = { id: string; title: string; metadata: unknown; created_at: string };
const content = (b: Pick<Belief, 'old' | 'next'>) => `Creencia que frena: ${b.old}${b.next ? `\nCreencia nueva: ${b.next}` : ''}`;

/** Sus creencias (las más recientes primero). */
export async function loadBeliefs(supabase: SupabaseClient, userId: string): Promise<Belief[]> {
  const { data } = await supabase.from('agent_knowledge').select('id, title, metadata, created_at').eq('user_id', userId)
    .eq('category', 'pensamiento').contains('tags', [BELIEF_TAG]).neq('status', 'archivado').order('created_at', { ascending: false }).limit(20);
  return ((data ?? []) as Row[]).map(readBelief);
}

/** Registrar una creencia (o que volvió a aparecer, o la creencia nueva que eligió). Sin duplicar la misma dicha de otra forma. */
export async function registerBelief(supabase: SupabaseClient, userId: string, input: BeliefInputT): Promise<{ ok: boolean; id?: string; created?: boolean }> {
  const list = await loadBeliefs(supabase, userId);
  const twin = findSimilar(list, input.belief);
  const b = applyBeliefInput(twin, input);
  if (twin) {
    const { error } = await supabase.from('agent_knowledge').update({ metadata: beliefMetadata(b), content: content(b) }).eq('id', twin.id).eq('user_id', userId);
    return { ok: !error, id: twin.id, created: false };
  }
  // Pocas a la vez: la más antigua que ya es suya (o la más antigua) se archiva (no se borra: es su historia).
  const open = list.filter((x) => beliefStage(x) !== 'tuya');
  if (open.length >= MAX_ACTIVE_BELIEFS) {
    const oldest = open.at(-1)!;
    await supabase.from('agent_knowledge').update({ status: 'archivado' }).eq('id', oldest.id).eq('user_id', userId);
  }
  const id = await remember(supabase, {
    user_id: userId, category: 'pensamiento', title: b.old.slice(0, 120), content: content(b), tags: [BELIEF_TAG],
    metadata: { ...beliefMetadata(b), eslabon_soi: 'pensamiento' }, status: 'activo',
  });
  return { ok: Boolean(id), id: id ?? undefined, created: true };
}

/** Cambiar su creencia nueva (la persona la escribe con sus palabras). */
export async function setReplacement(supabase: SupabaseClient, userId: string, id: string, next: string): Promise<boolean> {
  const b = (await loadBeliefs(supabase, userId)).find((x) => x.id === id);
  if (!b) return false;
  const upd = { ...b, next: next.trim() };
  const { error } = await supabase.from('agent_knowledge').update({ metadata: beliefMetadata(upd), content: content(upd) }).eq('id', id).eq('user_id', userId);
  // El Moment de la creencia repite la nueva: se actualiza (nueva versión del mismo).
  if (!error && b.moment_id) await supabase.rpc('save_moment_version', { p_id: b.moment_id, p_blocks: beliefMomentBlocks(upd), p_note: 'Creencia nueva' });
  return !error;
}

async function savePractice(supabase: SupabaseClient, userId: string, b: Belief, source: BeliefPractice['source']) {
  const practices = addPractice(b, source);
  if (practices === b.practices) return;
  await supabase.from('agent_knowledge').update({ metadata: beliefMetadata({ ...b, practices }) }).eq('id', b.id).eq('user_id', userId);
}

/**
 * Al terminar un Moment: si es el Moment de una creencia, o si reencuadró un pensamiento parecido a una creencia
 * (`thoughts`: lo que escribió en cada reencuadre o, si no lo cambió, el del bloque), cuenta como práctica.
 * Pensado para correr después de responder.
 */
export async function practiceFromRun(supabase: SupabaseClient, userId: string, momentId: string | null, thoughts: string[]) {
  const list = await loadBeliefs(supabase, userId);
  if (!list.length) return;
  const own = momentId ? list.find((b) => b.moment_id === momentId) : null;
  if (own) { await savePractice(supabase, userId, own, 'moment'); return; }
  const done = new Set<string>();
  for (const t of thoughts) {
    const b = findSimilar(list, t);
    if (b && !done.has(b.id)) { done.add(b.id); await savePractice(supabase, userId, b, 'reframe'); }
  }
}

/** El Moment de una creencia (se crea una vez y se reutiliza). */
export async function ensureBeliefMoment(supabase: SupabaseClient, userId: string, id: string): Promise<string | null> {
  const b = (await loadBeliefs(supabase, userId)).find((x) => x.id === id);
  if (!b) return null;
  if (b.moment_id) {
    const { data } = await supabase.from('soi_blueprints').select('id').eq('id', b.moment_id).eq('creator_id', userId).neq('status', 'archived').maybeSingle();
    if (data) return b.moment_id;
  }
  const blocks = beliefMomentBlocks(b);
  const title = b.next ? `Entrenar: ${b.next}` : 'Mirar de nuevo un pensamiento';
  const { data, error } = await supabase.from('soi_blueprints').insert({
    creator_id: userId, title: title.slice(0, 80), objective: `Debilitar «${b.old}» practicando una creencia más útil, un día a la vez.`.slice(0, 300),
    kind: 'daily', source: 'Diseñado por SOI · basado en Aaron Beck y Napoleon Hill', blocks, steps: [], status: 'private',
  }).select('id').single();
  if (error || !data) return null;
  const momentId = data.id as string;
  await supabase.from('agent_knowledge').update({ metadata: beliefMetadata({ ...b, moment_id: momentId }) }).eq('id', b.id).eq('user_id', userId);
  scheduleAutoCover(momentId, { title, objective: b.next ?? b.old, kind: 'daily', blocks, context: b.next ?? b.old, part: 'manana' });
  return momentId;
}
