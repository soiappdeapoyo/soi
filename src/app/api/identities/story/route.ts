import { z } from 'zod/v3';
import { getSessionUser, createAdminClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { objectWithFallback } from '@/lib/ai/fallback';
import { loadIdentityView } from '@/lib/identity/view';
import { dateInTz } from '@/lib/utils';

export const maxDuration = 45;

const clean = (v: unknown, max = 200) => String(v ?? '').replace(/[\r\n`<>]/g, ' ').slice(0, max);

/** Lunes de la semana actual en la zona de la persona (una historia por semana). */
function weekStart(timeZone: string) {
  const today = dateInTz(new Date(), timeZone);
  const d = new Date(`${today}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - dow * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Relato semanal de "Tu historia", escrito por la IA con datos reales (terapia narrativa: las personas cambian
 * porque construyen historias). Se genera una vez por semana y se guarda.
 */
export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const week = weekStart(tz);
  const { data: saved } = await supabase.from('identity_stories').select('story').eq('user_id', user.id).eq('week_start', week).maybeSingle();
  if (saved) return Response.json({ story: saved.story, week });

  const v = await loadIdentityView(supabase, user.id, profile, tz);
  if (v.evidence.length < 2 || !v.active.length) return Response.json({ story: null, week });
  try {
    const { object } = await objectWithFallback({
      schema: z.object({ story: z.string() }),
      instructions: `Escribes "Tu historia" en SOI: un relato breve (90 a 140 palabras), en segunda persona y en español latinoamericano,
sobre en quién se está convirtiendo esta persona, como lo haría la terapia narrativa: de dónde partió, qué decidió, qué evidencia lo demuestra.
Usa SOLO los datos dados (no inventes hechos, cifras ni fechas). Nada de frases motivacionales genéricas ni puntajes. Cálido, sobrio y concreto.`,
      prompt: `Visión: ${clean(v.vision.aim) || '—'} ${v.vision.target ? `· ${clean(v.vision.target, 80)}` : ''} ${v.vision.deadline ? `· para ${clean(v.vision.deadline, 40)}` : ''}
Metas: ${clean(v.vision.goals.join(' · '), 300) || '—'}
Identidades: ${v.active.map((i) => `${clean(i.name, 60)} (nivel ${i.level.level}, ${i.evidenceCount} evidencias)`).join('; ')}
Capacidades: ${v.capacities.slice(0, 5).map((c) => `${c.name} nivel ${c.level.level}`).join(', ') || '—'}
Observaciones: ${v.observations.join(' ') || '—'}
Línea de tiempo: ${v.story.map((s) => `${dateInTz(s.at, tz)}: ${clean(s.text, 160)}`).join(' | ')}
Evidencias recientes: ${v.evidence.slice(0, 8).map((e) => `${clean(e.title, 60)}${e.note ? ` («${clean(e.note, 100)}»)` : ''}`).join(' | ')}`,
      timeoutMs: 30_000,
    });
    const story = object.story.trim().slice(0, 3000);
    await createAdminClient().from('identity_stories').upsert({ user_id: user.id, week_start: week, story });
    return Response.json({ story, week });
  } catch {
    return Response.json({ story: null, week });
  }
}
