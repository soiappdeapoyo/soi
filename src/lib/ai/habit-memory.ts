import { z } from 'zod/v3';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Habit, HabitMemory } from './prompts/james-clear';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Lo que el coach de hábitos guarda de UN hábito (se actualiza por partes; `name` lo identifica). */
export const HabitPatchSchema = z.object({
  name: z.string().min(2).max(80).describe('El hábito en pocas palabras, p. ej. "Leer antes de dormir"'),
  mode: z.enum(['build', 'break']).optional().describe('build = crear, break = dejar'),
  identity: z.string().max(160).optional().describe('«Soy alguien que…»: la identidad por la que vota'),
  tiny: z.string().max(160).optional().describe('La versión de 2 minutos'),
  cue: z.string().max(160).optional().describe('La señal: «Después de…» o lugar y momento'),
  time: z.string().regex(TIME).optional().describe('Hora local HH:MM, si la tiene'),
  place: z.string().max(80).optional(),
  environment: z.string().max(200).optional().describe('Qué cambia en su entorno (fricción)'),
  reward: z.string().max(160).optional().describe('Cómo lo vuelve satisfactorio'),
  weak_law: z.enum(['obvio', 'atractivo', 'facil', 'satisfactorio']).optional().describe('La ley que más falla'),
  status: z.enum(['active', 'paused', 'automatic']).optional().describe('automatic = ya le sale solo'),
});
export type HabitPatch = z.infer<typeof HabitPatchSchema>;

const TAG = 'habitos';
/** Activos o en pausa a la vez: un hábito a la vez es el consejo; dejamos margen para varios en paralelo. */
export const MAX_HABITS = 6;

const key = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

/** Aplica un cambio a la lista (puro): mismo nombre → se actualiza; nuevo → se agrega al inicio, sin pasar de MAX_HABITS sin terminar. */
export function applyHabitPatch(list: Habit[], patch: HabitPatch & { moment_id?: string }, now = new Date().toISOString()): Habit[] {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== '')) as HabitPatch & { moment_id?: string };
  const i = list.findIndex((h) => key(h.name) === key(patch.name));
  if (i >= 0) return list.map((h, j) => (j === i ? { ...h, ...defined, updated_at: now } : h));
  const next: Habit = { mode: 'build', status: 'active', ...defined, updated_at: now };
  const open = list.filter((h) => h.status !== 'automatic');
  const done = list.filter((h) => h.status === 'automatic');
  return [next, ...open.slice(0, MAX_HABITS - 1), ...done.slice(0, 10)];
}

/** Memoria de hábitos: una fila de agent_knowledge (perfil_usuario + tag "habitos"). Sin migración. */
export async function loadHabits(supabase: SupabaseClient, userId: string): Promise<{ id: string | null; memory: HabitMemory | null }> {
  const { data } = await supabase.from('agent_knowledge').select('id, metadata').eq('user_id', userId)
    .eq('category', 'perfil_usuario').contains('tags', [TAG]).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  const habits = (data?.metadata as HabitMemory | undefined)?.habits;
  return { id: (data?.id as string | undefined) ?? null, memory: Array.isArray(habits) ? { habits } : null };
}

export async function saveHabit(supabase: SupabaseClient, userId: string, patch: HabitPatch & { moment_id?: string }): Promise<boolean> {
  const { id, memory } = await loadHabits(supabase, userId);
  const habits = applyHabitPatch(memory?.habits ?? [], patch);
  // El texto también llega a la memoria general (RAG): cualquier agente sabe qué hábitos está construyendo.
  const content = habits.filter((h) => h.status !== 'automatic').map((h) => `${h.mode === 'break' ? 'Dejar' : 'Crear'}: ${h.name}${h.cue ? ` (${h.cue})` : ''}${h.identity ? ` — ${h.identity}` : ''}`)
    .join('\n') || 'Hábitos con SOI';
  const metadata: HabitMemory = { habits };
  if (id) {
    const { error } = await supabase.from('agent_knowledge').update({ metadata, content }).eq('id', id).eq('user_id', userId);
    return !error;
  }
  const { error } = await supabase.from('agent_knowledge').insert({
    user_id: userId, category: 'perfil_usuario', title: 'Mis hábitos', content, tags: [TAG], metadata,
  });
  return !error;
}
