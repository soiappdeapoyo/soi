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

/** Desde esta fecha "Tu historia" es un retrato en presente (antes, una crónica por fechas). */
const PORTRAIT_SINCE = '2026-10-08T00:00:00Z';

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
  const { data: saved } = await supabase.from('identity_stories').select('story, created_at').eq('user_id', user.id).eq('week_start', week).maybeSingle();
  // Los relatos anteriores al retrato (narraban eventos por fecha) se reescriben.
  if (saved && Date.parse(saved.created_at) >= Date.parse(PORTRAIT_SINCE)) return Response.json({ story: saved.story, week });

  const v = await loadIdentityView(supabase, user.id, profile, tz);
  if (v.evidence.length < 2 || !v.active.length) return Response.json({ story: null, week });
  try {
    const { object } = await objectWithFallback({
      schema: z.object({ story: z.string() }),
      instructions: `Escribes "Tu historia" en SOI: un retrato breve (90 a 130 palabras, 2 o 3 párrafos), en segunda persona y en español latinoamericano,
de EN QUIÉN SE ESTÁ CONVIRTIENDO esta persona, para que pueda verse a sí misma.
- NO narres eventos ni cronología: nada de fechas, días, "primero… luego…", "el martes", "hace unas semanas" ni listas de lo que hizo.
- Escribe en PRESENTE, como rasgos que ya son suyos ("Eres alguien que vuelve aunque…", "Te estás volviendo una persona que…"), demostrados por lo que hace.
- Usa sus propias palabras entre «» cuando las haya; ellas dicen más que cualquier resumen.
- Cierra con una imagen concreta de su yo futuro viviendo su propósito o sus metas, en presente ("Te ves…"), sin prometer resultados.
- Usa SOLO los datos dados: no inventes hechos ni cifras. Sin puntajes, niveles, conteos ni frases motivacionales genéricas. Cálido, sobrio, humano.`,
      prompt: `Propósito: ${clean(v.vision.aim) || '—'} ${v.vision.target ? `· ${clean(v.vision.target, 80)}` : ''}
Metas: ${clean(v.vision.goals.join(' · '), 300) || '—'}
En quién se está convirtiendo (de más a menos evidencia): ${v.active.map((i) => clean(i.name, 60)).join('; ')}
Lo que más está fortaleciendo: ${v.capacities.slice(0, 4).map((c) => c.name).join(', ') || '—'}
Lo que SOI observa: ${v.observations.join(' ') || '—'}
Lo que hace: ${[...new Set(v.evidence.slice(0, 12).map((e) => clean(e.title, 60)))].join(' · ')}
${v.evidence.some((e) => e.kind === 'regreso') ? 'Ha vuelto después de alejarse unos días.\n' : ''}Sus palabras: ${v.evidence.filter((e) => e.note && (e.kind === 'reflexion' || e.kind === 'logro')).slice(0, 5).map((e) => `«${clean(e.note, 140)}»`).join(' ') || '—'}`,
      timeoutMs: 30_000,
    });
    const story = object.story.trim().slice(0, 3000);
    await createAdminClient().from('identity_stories').upsert({ user_id: user.id, week_start: week, story });
    return Response.json({ story, week });
  } catch {
    return Response.json({ story: null, week });
  }
}
