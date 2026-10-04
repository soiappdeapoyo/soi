import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { recordMomentum } from '@/lib/momentum-server';
import { registerRitualDay } from '@/lib/streak';
import { remember } from '@/lib/ai/rag';
import { rpcError } from '@/lib/social/guard';
import { todayISO } from '@/lib/utils';

const Body = z.object({
  moodAfter: z.number().int().min(1).max(5).optional(),
  learning: z.string().trim().max(1000).optional(),
  helped: z.boolean().optional(),
});

type Outputs = Record<string, { text?: string; skipped?: boolean; type?: string } | undefined>;

/**
 * Cerrar la ejecución: resultados (ánimo después) y aprendizaje ("¿qué funcionó?").
 * Efectos: momentum, racha sin castigo, metas nuevas al perfil, próximo paso como Action Card y aprendizaje a la memoria.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });

  const { data: run } = await supabase.from('moment_runs').select('outputs, moment_id, moment_slug').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!run) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });

  const { error } = await supabase.rpc('complete_moment_run', {
    p_run_id: id, p_mood_after: parsed.data.moodAfter ?? null, p_learning: parsed.data.learning ?? null, p_helped: parsed.data.helped ?? null,
  });
  if (error) return rpcError(error.message);

  const outputs = (run.outputs ?? {}) as Outputs;
  const ref = { run_id: id, moment_id: run.moment_id, moment_slug: run.moment_slug };
  const profile = await getProfile(user.id);

  // Metas escritas en bloques "Objetivo" → perfil (máx. 10).
  const goals = Object.values(outputs).filter((o) => o?.type === 'goal' && o.text?.trim()).map((o) => o!.text!.trim().slice(0, 120));
  if (goals.length && profile) {
    const merged = [...new Set([...(profile.goals ?? []), ...goals])].slice(-10);
    await supabase.from('user_profiles').update({ goals: merged }).eq('user_id', user.id);
    await recordMomentum(supabase, user.id, 'goal_set', { eslabon: 'resultado', metadata: ref });
  }
  // "Próximo paso" → Action Card pendiente.
  for (const o of Object.values(outputs)) {
    if (o?.type === 'next_step' && o.text?.trim()) {
      await remember(supabase, {
        user_id: user.id, category: 'accion', title: o.text.trim().slice(0, 120), content: o.text.trim(),
        tags: ['action_card'], status: 'en_progreso', metadata: { eslabon_soi: 'accion', minutes: 5, source: 'moment', ...ref }, withEmbedding: false,
      });
    }
  }
  // Aprendizaje → memoria transversal (el agente lo recordará).
  if (parsed.data.learning) {
    await remember(supabase, {
      user_id: user.id, category: 'resultado', title: 'Lo que funcionó en un Moment', content: parsed.data.learning,
      tags: ['aprendizaje', 'moment'], metadata: { eslabon_soi: 'resultado', ...ref },
    });
  }

  await recordMomentum(supabase, user.id, 'moment_completed', { eslabon: 'accion', metadata: ref });
  const streak = await registerRitualDay(supabase, user.id, todayISO(profile?.timezone ?? undefined));
  return Response.json({ ok: true, streak });
}
