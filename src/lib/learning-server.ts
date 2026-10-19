import type { SupabaseClient } from '@supabase/supabase-js';
import { remember } from '@/lib/ai/rag';
import { recordMomentum } from '@/lib/momentum-server';
import {
  LEARNING_TAG, learningContent, learningMetadata, readLearning, type Learning, type LearningInputT, type Outcome,
} from '@/lib/learning';

type Row = { id: string; title: string; metadata: unknown; created_at: string };

export async function loadLearnings(supabase: SupabaseClient, userId: string, limit = 30): Promise<Learning[]> {
  const { data } = await supabase.from('agent_knowledge').select('id, title, metadata, created_at').eq('user_id', userId)
    .eq('category', 'pensamiento').contains('tags', [LEARNING_TAG]).order('created_at', { ascending: false }).limit(limit);
  return ((data ?? []) as Row[]).map(readLearning);
}

/** Guarda lo aprendido (y, si hay acción, cuándo preguntar si funcionó). */
export async function saveLearning(supabase: SupabaseClient, userId: string, input: LearningInputT, today: string, extra: Record<string, unknown> = {}): Promise<string | null> {
  const id = await remember(supabase, {
    user_id: userId, category: 'pensamiento', title: `De «${input.source}»`.slice(0, 120),
    content: learningContent({ learned: input.learned, meaning: input.meaning ?? null, action: input.action ?? null, measure: input.measure ?? null }),
    tags: [LEARNING_TAG, 'insight'], metadata: { ...learningMetadata(input, today), eslabon_soi: 'pensamiento', ...extra },
  });
  if (id) await recordMomentum(supabase, userId, 'reflection', { eslabon: 'pensamiento', metadata: { learning_id: id } });
  return id ?? null;
}

/** ¿Funcionó? Lo que funcionó cuenta como acción cumplida; lo que no, queda como aprendizaje. */
export async function closeLearning(supabase: SupabaseClient, userId: string, id: string, outcome: Outcome, note?: string): Promise<boolean> {
  const { data } = await supabase.from('agent_knowledge').select('id, title, metadata, created_at').eq('id', id).eq('user_id', userId)
    .contains('tags', [LEARNING_TAG]).maybeSingle();
  if (!data) return false;
  const l = readLearning(data as Row);
  const metadata = { ...(data.metadata as Record<string, unknown>), outcome, outcome_note: note?.trim() || null, closed_at: new Date().toISOString() };
  const content = `${learningContent(l)}\nResultado: ${outcome === 'funciono' ? 'funcionó' : outcome === 'a_medias' ? 'a medias' : 'no lo hizo'}${note?.trim() ? ` — ${note.trim()}` : ''}`;
  const { error } = await supabase.from('agent_knowledge').update({ metadata, content, status: 'completado' }).eq('id', id).eq('user_id', userId);
  if (!error && outcome === 'funciono') await recordMomentum(supabase, userId, 'action_completed', { eslabon: 'resultado', metadata: { learning_id: id } });
  return !error;
}
