import { z } from 'zod/v3';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { RITUAL_PHASES, type RitualPhase } from '@/config/navigation';
import { objectWithFallback } from '@/lib/ai/fallback';

export const RitualSchema = z.object({
  affirmation: z.string().describe('Afirmación personalizada en presente, primera persona (Pensamiento)'),
  visualization: z.string().describe('Visualización guiada de 3-4 frases (Emoción)'),
  action: z.string().describe('Una acción concreta y medible para hoy (Acción)'),
  signal: z.string().describe('Una señal a notar durante el día como evidencia (Resultado)'),
  source: z.string().describe('Autor y libro en que se inspira el ritual'),
});
export type DailyRitual = z.infer<typeof RitualSchema> & { date: string; phase: RitualPhase };

export async function generateRitual(profile: UserProfile, date: string): Promise<DailyRitual> {
  const phase = (profile.ritual_phase ?? 'chispa') as RitualPhase;
  const { object } = await objectWithFallback({
    schema: RitualSchema,
    instructions: `Generas el ritual diario de SOI en español neutro. 4 partes mapeadas al principio SOI:
Pensamiento (afirmación) → Emoción (visualización) → Acción (acción concreta) → Resultado (señal a notar).
Usa solo técnicas de Neville Goddard, Joe Dispenza, Napoleon Hill, Brian Tracy, Hal Elrod o Robin Sharma y cita la fuente.
Sin promesas garantizadas ni consejos médicos.`,
    prompt: `Fase: ${RITUAL_PHASES[phase]?.label ?? 'Chispa'} (${RITUAL_PHASES[phase]?.desc ?? ''}).
Eslabón más débil: ${profile.weakest_link ?? 'desconocido'}.
Metas: ${(profile.goals ?? []).join('; ') || 'no registradas'}.
Emoción dominante: ${profile.dominant_emotion ?? 'desconocida'}.`,
  });
  return { ...object, date, phase };
}

export async function getOrCreateRitual(supabase: SupabaseClient, profile: UserProfile, date: string) {
  const { data: existing } = await supabase
    .from('agent_knowledge')
    .select('id, metadata')
    .eq('user_id', profile.user_id)
    .eq('category', 'ritual_diario')
    .eq('metadata->>date', date)
    .maybeSingle();
  if (existing) return { id: existing.id as string, ritual: existing.metadata as DailyRitual };

  const ritual = await generateRitual(profile, date);
  const { data } = await supabase
    .from('agent_knowledge')
    .insert({
      user_id: profile.user_id, category: 'ritual_diario', title: `Ritual ${date}`,
      content: `${ritual.affirmation}\n${ritual.visualization}\n${ritual.action}\n${ritual.signal}`,
      metadata: ritual, tags: ['ritual', ritual.phase],
    })
    .select('id')
    .single();
  return { id: data?.id as string, ritual };
}
