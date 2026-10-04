import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { objectWithFallback } from '@/lib/ai/fallback';
import { remember } from '@/lib/ai/rag';

const Analysis = z.object({
  archetype: z.string().max(60).describe('Arquetipo simbólico, ej. "La Exploradora", "El Constructor"'),
  dominantEmotion: z.string().max(40),
  recurringThemes: z.array(z.string().max(40)).max(6),
  weakestLink: z.enum(['pensamiento', 'emocion', 'accion', 'resultado']),
  summary: z.string().max(800).describe('Lectura compasiva, sin diagnósticos clínicos'),
  nextStep: z.string().max(200),
});

/** Análisis psicológico profundo (SOI+). No es diagnóstico clínico. */
export async function POST() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'deep_analysis')).allowed) return new Response('SOI+ requerido', { status: 402 });

  const { data: msgs } = await supabase.from('messages')
    .select('content').eq('user_id', user.id).eq('role', 'user')
    .order('created_at', { ascending: false }).limit(60);
  if (!msgs?.length) return Response.json({ ok: false, message: 'Conversa un poco más con SOI para generar tu análisis.' }, { status: 400 });

  const { object } = await objectWithFallback({
    schema: Analysis,
    instructions: `Analizas patrones de pensamiento-emoción-acción-resultado (principio SOI) a partir de mensajes de una persona.
Lenguaje compasivo, español neutro. NO es diagnóstico clínico. No uses etiquetas de trastornos.`,
    prompt: msgs.map((m) => `- ${String(m.content).slice(0, 300)}`).join('\n'),
  });

  await supabase.from('user_profiles').update({
    archetype: object.archetype,
    dominant_emotion: object.dominantEmotion,
    recurring_themes: object.recurringThemes,
    weakest_link: object.weakestLink,
  }).eq('user_id', user.id);

  await remember(supabase, {
    user_id: user.id, category: 'perfil_usuario', title: `Análisis: ${object.archetype}`,
    content: `${object.summary}\nSiguiente paso: ${object.nextStep}`,
    metadata: { eslabon_soi: object.weakestLink, type: 'deep_analysis' }, tags: ['analisis'],
  });

  return Response.json({ ok: true, analysis: object });
}
