import { z } from 'zod';
import { getSessionUser } from '@/lib/supabase/server';
import { objectWithFallback } from '@/lib/ai/fallback';
import { remember } from '@/lib/ai/rag';
import { MIRROR_CARDS, SOI_PRINCIPLE_LINE } from '@/config/onboarding';
import { ROUTINES, routineForMinutes } from '@/config/routines';

const Body = z.object({
  cardId: z.string(),
  minutes: z.number().int().min(1).max(120),
  note: z.string().max(500).optional(),
});

const ResponseSchema = z.object({
  validation: z.string().describe('Validación emocional cálida, 2-3 frases'),
  reframe: z.string().describe('Reformulación usando el principio SOI'),
  microAction: z.string().describe('Una micro-acción concreta para las próximas 24 horas'),
  dominantEmotion: z.string().max(40),
});

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });

  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });
  const card = MIRROR_CARDS.find((c) => c.id === parsed.data.cardId);
  if (!card) return new Response('Tarjeta inválida', { status: 400 });

  const routineId = routineForMinutes(parsed.data.minutes);
  const routine = ROUTINES[routineId];

  const { object } = await objectWithFallback({
    schema: ResponseSchema,
    system: `Eres SOI. Onboarding inspirado en Brian Tracy. Español neutro, cálido, breve.
Estructura: validación emocional → reformulación con el principio SOI ("${SOI_PRINCIPLE_LINE}") → micro-acción de 24h.
Nunca prometas resultados garantizados ni des consejos médicos.`,
    prompt: `La persona eligió el espejo: "${card.title}" (${card.hint}). Eslabón probable: ${card.eslabon}.
${parsed.data.note ? `Añadió: "${parsed.data.note.replace(/["\n]/g, ' ')}"` : ''}`,
  });

  await supabase.from('user_profiles').update({
    onboarding_completed: true,
    weakest_link: card.eslabon,
    dominant_emotion: object.dominantEmotion,
    preferred_routine: routineId,
    available_minutes: parsed.data.minutes,
  }).eq('user_id', user.id);

  await remember(supabase, {
    user_id: user.id, category: 'perfil_usuario', title: `Onboarding: ${card.title}`,
    content: `${object.validation}\n${object.reframe}\nMicro-acción: ${object.microAction}`,
    metadata: { eslabon_soi: card.eslabon, card: card.id, minutes: parsed.data.minutes, routine: routineId },
    tags: ['onboarding'],
  });

  return Response.json({
    ...object,
    routine: { id: routineId, label: routine.label, author: routine.author, minutes: routine.totalMinutes, source: routine.source },
  });
}
