import { createHash } from 'node:crypto';
import { z } from 'zod/v3';
import { createAdminClient } from '@/lib/supabase/server';
import { BLOCK_COPY, checkDescription, diffSpecs } from '@/lib/persons/spec';
import { generateDescribed } from '@/lib/persons/ai';
import { regionFor } from '@/config/regionalisms';
import { loadPersona, personsApiSession } from '@/lib/persons/server';
import { canGenerate, GATE_COPY } from '@/lib/persons/entitlements';
import { startOfTodayISO } from '@/lib/utils';

export const maxDuration = 60;

const Body = z.object({
  description: z.string().max(400).default(''),
  name: z.string().max(40).optional(),
  /** Ajustar una persona existente: su id y lo que cambia. */
  personaId: z.string().uuid().optional(),
  delta: z.string().max(400).optional(),
});

/**
 * Genera una ficha (PersonSpec) desde una descripción, o ajusta la de una persona: solo la vista previa, sin guardar.
 * Moderación antes (sin IA) y después; los intentos bloqueados se anotan solo con el motivo y un hash.
 */
export async function POST(req: Request) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  const { description, name, personaId, delta } = parsed.data;
  const input = (personaId ? delta : description)?.trim() ?? '';
  if (input.length < (personaId ? 4 : 30)) return Response.json({ error: personaId ? 'Escribe qué quieres cambiar.' : 'Descríbela con un poco más de detalle (mínimo 30 caracteres).' }, { status: 400 });

  const db = createAdminClient();
  const kind = personaId ? 'adjust' : 'create';
  const descriptionHash = createHash('sha256').update(input).digest('hex').slice(0, 32);
  const blocked = checkDescription(`${input} ${name ?? ''}`);
  if (blocked) {
    await db.from('persona_generations').insert({ user_id: s.userId, kind, blocked_reason: blocked, description_hash: descriptionHash });
    return Response.json({ error: BLOCK_COPY[blocked], reason: blocked }, { status: 422 });
  }

  const { count } = await db.from('persona_generations').select('id', { count: 'exact', head: true })
    .eq('user_id', s.userId).is('blocked_reason', null).gte('created_at', startOfTodayISO(s.timezone));
  if (!canGenerate(s.limits, count ?? 0).ok) return Response.json({ error: GATE_COPY.generation_limit, reason: 'generation_limit' }, { status: 429 });

  const base = personaId ? await loadPersona(s.userId, personaId) : null;
  if (personaId && !base) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });

  try {
    const result = await generateDescribed({ description: input, name, base: base?.spec, delta, region: regionFor(s.region) });
    await db.from('persona_generations').insert({ user_id: s.userId, kind, blocked_reason: result ? null : 'output', description_hash: descriptionHash });
    if (!result) return Response.json({ error: BLOCK_COPY.real_person, reason: 'output' }, { status: 422 });
    return Response.json({
      described: result.described,
      sourceDescription: base ? `${base.spec.sourceDescription}\nAjuste: ${input}`.slice(-600) : input,
      diff: base ? diffSpecs(base.spec, result.described) : null,
    });
  } catch (error) {
    console.error('[persons] generar', error instanceof Error ? error.message : error);
    return Response.json({ error: 'No pudimos crear el personaje ahora. Intenta de nuevo en un momento.' }, { status: 503 });
  }
}
