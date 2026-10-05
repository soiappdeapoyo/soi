import { z } from 'zod/v3';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HillMemory } from './prompts/napoleon-hill';

/** Campos que Hill puede guardar (todos opcionales: se actualiza por partes). */
export const HillPatchSchema = z.object({
  definite_chief_aim: z.string().max(300).optional().describe('Propósito principal definido, en una frase'),
  why: z.string().max(300).optional(),
  target: z.string().max(160).optional().describe('Cuánto / qué exactamente'),
  deadline: z.string().max(60).optional().describe('Para cuándo'),
  exchange: z.string().max(300).optional().describe('Qué dará a cambio'),
  plan: z.string().max(600).optional(),
  obstacle: z.string().max(300).optional(),
  fear: z.string().max(160).optional(),
  knowledge_needed: z.string().max(300).optional(),
  mastermind: z.array(z.string().max(80)).max(8).optional(),
  stage: z.enum(['deseo', 'fe', 'autosugestion', 'conocimiento', 'imaginacion', 'plan', 'decision', 'persistencia', 'mastermind', 'resultado']).optional(),
  commitments: z.array(z.string().max(160)).max(8).optional(),
  last_review: z.string().max(60).optional(),
});

const TAG = 'hill';

/** Memoria longitudinal de Hill: una fila de agent_knowledge (perfil_usuario + tag "hill"). Sin migración. */
export async function loadHillMemory(supabase: SupabaseClient, userId: string): Promise<{ id: string | null; memory: HillMemory | null }> {
  const { data } = await supabase.from('agent_knowledge').select('id, metadata').eq('user_id', userId)
    .eq('category', 'perfil_usuario').contains('tags', [TAG]).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  return { id: (data?.id as string | undefined) ?? null, memory: (data?.metadata as HillMemory | undefined) ?? null };
}

export async function saveHillMemory(supabase: SupabaseClient, userId: string, patch: z.infer<typeof HillPatchSchema>) {
  const { id, memory } = await loadHillMemory(supabase, userId);
  const next: HillMemory = { ...(memory ?? {}), ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== '')), updated_at: new Date().toISOString() };
  const content = [next.definite_chief_aim && `Propósito: ${next.definite_chief_aim}`, next.plan && `Plan: ${next.plan}`, next.obstacle && `Obstáculo: ${next.obstacle}`]
    .filter(Boolean).join('\n') || 'Plan de Napoleon Hill';
  if (id) {
    const { error } = await supabase.from('agent_knowledge').update({ metadata: next, content }).eq('id', id).eq('user_id', userId);
    return !error;
  }
  const { error } = await supabase.from('agent_knowledge').insert({
    user_id: userId, category: 'perfil_usuario', title: 'Plan con Napoleon Hill', content, tags: [TAG], metadata: next,
  });
  return !error;
}
