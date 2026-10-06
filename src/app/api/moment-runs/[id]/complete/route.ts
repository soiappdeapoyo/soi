import { z } from 'zod/v3';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { recordMomentum } from '@/lib/momentum-server';
import { registerRitualDay } from '@/lib/streak';
import { identityGains } from '@/lib/identity/gains';
import { remember } from '@/lib/ai/rag';
import { rpcError } from '@/lib/social/guard';
import { todayISO } from '@/lib/utils';
import { challengeLength } from '@/lib/moments/challenge';

const Body = z.object({
  moodAfter: z.number().int().min(1).max(5).optional(),
  learning: z.string().trim().max(1000).optional(),
  helped: z.boolean().optional(),
});

type Out = { text?: string; skipped?: boolean; type?: string; items?: string[]; value?: number; when?: string; signedAt?: string; fields?: Record<string, string> };
type Outputs = Record<string, Out | undefined>;

/**
 * Cerrar la ejecución: resultados (ánimo después) y aprendizaje ("¿qué funcionó?").
 * Efectos: momentum, racha sin castigo, metas nuevas al perfil, próximo paso como Action Card y aprendizaje a la memoria.
 */
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return new Response('Datos inválidos', { status: 400 });

  const { data: run } = await supabase.from('moment_runs').select('outputs, moment_id, moment_slug, challenge_day, completed_at').eq('id', id).eq('user_id', user.id).maybeSingle();
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
  // Acciones v2 → memoria, recordatorios y próximos pasos.
  for (const o of Object.values(outputs)) {
    if (!o || o.skipped) continue;
    if (o.type === 'agenda' && o.text?.trim() && o.when) {
      await remember(supabase, {
        user_id: user.id, category: 'accion', title: 'Recordatorio', content: o.text.trim().slice(0, 200),
        tags: ['recordatorio'], status: 'en_progreso', metadata: { eslabon_soi: 'accion', remind_at: o.when, ...ref }, withEmbedding: false,
      });
    }
    if (o.type === 'contract' && o.signedAt && o.fields?.commitment) {
      await remember(supabase, {
        user_id: user.id, category: 'accion', title: 'Contrato conmigo', content: `${o.fields.commitment}${o.fields.consequence ? ` · Si no: ${o.fields.consequence}` : ''} — firmado por ${o.text ?? ''}`.slice(0, 1000),
        tags: ['contrato'], status: 'en_progreso', metadata: { eslabon_soi: 'accion', signed_at: o.signedAt, ...ref },
      });
    }
    if (o.type === 'weekly_review') {
      const f = o.fields ?? {};
      const prios = (o.items ?? []).map((x) => x.trim()).filter(Boolean);
      const content = [f.wins && `Victorias: ${f.wins}`, f.lessons && `Aprendí: ${f.lessons}`, f.letgo && `Dejo ir: ${f.letgo}`, prios.length && `Prioridades: ${prios.join('; ')}`].filter(Boolean).join('\n');
      if (content) {
        await remember(supabase, { user_id: user.id, category: 'resultado', title: 'Revisión semanal', content: content.slice(0, 3000), tags: ['revision_semanal'], metadata: { eslabon_soi: 'resultado', ...ref } });
      }
      for (const p of prios.slice(0, 3)) {
        await remember(supabase, {
          user_id: user.id, category: 'accion', title: p.slice(0, 120), content: p, tags: ['action_card'], status: 'en_progreso',
          metadata: { eslabon_soi: 'accion', minutes: 10, source: 'weekly_review', ...ref }, withEmbedding: false,
        });
      }
    }
    if (o.type === 'tracking' && typeof o.value === 'number' && o.text) {
      await remember(supabase, {
        user_id: user.id, category: 'resultado', title: o.text.slice(0, 80), content: `${o.value} ${o.fields?.unit ?? ''}`.trim(),
        tags: ['seguimiento'], metadata: { eslabon_soi: 'resultado', metric: o.text, value: o.value, unit: o.fields?.unit ?? '', ...ref }, withEmbedding: false,
      });
    }
    if (o.type === 'mind_map' && o.text && (o.items ?? []).some((x) => x.trim())) {
      await remember(supabase, {
        user_id: user.id, category: 'pensamiento', title: `Mapa mental: ${o.text}`.slice(0, 120),
        content: (o.items ?? []).filter((x) => x.trim()).join(' · ').slice(0, 1000), tags: ['mapa_mental'], metadata: { eslabon_soi: 'pensamiento', ...ref },
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

  // Reto: marca el día como completado (un día por día de calendario; sin castigo si faltó alguno).
  let challenge: { day: number; completed: number; finished: boolean } | null = null;
  const today = todayISO(profile?.timezone ?? undefined);
  if (run.challenge_day && !run.completed_at) {
    let q = supabase.from('challenge_enrollments').select('id, completed, status').eq('user_id', user.id);
    q = run.moment_id ? q.eq('moment_id', run.moment_id) : q.eq('moment_slug', run.moment_slug);
    const { data: e } = await q.maybeSingle();
    if (e) {
      const completed = { ...(e.completed as Record<string, string>) };
      if (!Object.values(completed).includes(today)) completed[String(run.challenge_day)] = today;
      const { data: m } = run.moment_id
        ? await supabase.from('soi_blueprints').select('duration_days, blocks').eq('id', run.moment_id).maybeSingle()
        : { data: null };
      const total = m ? challengeLength((m.blocks as { day?: number }[]) ?? [], m.duration_days as number) : 1;
      const finished = Object.keys(completed).length >= total;
      await supabase.from('challenge_enrollments').update({ completed, status: finished ? 'completed' : 'active' }).eq('id', e.id);
      challenge = { day: run.challenge_day as number, completed: Object.keys(completed).length, finished };
    }
  }

  await recordMomentum(supabase, user.id, 'moment_completed', { eslabon: 'accion', metadata: ref });
  const streak = await registerRitualDay(supabase, user.id, today);
  // Mi Nuevo Yo: qué identidades y capacidades fortaleció este Moment (y si subió de nivel).
  const { data: doneRun } = await supabase.from('moment_runs').select('completed_at').eq('id', id).maybeSingle();
  const identity = doneRun?.completed_at
    ? await identityGains(supabase, user.id, profile, run.moment_id ? `m:${run.moment_id}` : `s:${run.moment_slug}`, doneRun.completed_at as string).catch(() => null)
    : null;
  return Response.json({ ok: true, streak, challenge, identity });
}
