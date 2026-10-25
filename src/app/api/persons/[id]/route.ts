import { z } from 'zod/v3';
import { createAdminClient } from '@/lib/supabase/server';
import { buildSpec, DescribedSchema, diffSpecs, normalizeDescribed } from '@/lib/persons/spec';
import { parseEmotion } from '@/lib/persons/emotion';
import { activeCount, insertPersona, loadPersona, personsApiSession } from '@/lib/persons/server';
import { canCreatePersona, GATE_COPY } from '@/lib/persons/entitlements';

const Body = z.discriminatedUnion('action', [
  z.object({ action: z.literal('archive') }),
  z.object({ action: z.literal('unarchive') }),
  z.object({ action: z.literal('apply'), described: DescribedSchema, sourceDescription: z.string().max(600).default('') }),
]);

/**
 * Archivar (nunca se borra el historial), recuperar o aplicar un ajuste. Regla de preservación: cambiar quién es
 * (edad, género, profesión, ciudad) archiva a esta persona y crea otra; cambiar rasgos o tono reinicia la apertura;
 * cambiar sus límites reinicia la confianza. Nombre, bio, intereses o estilo se cambian sin tocar nada más.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) return Response.json({ error: 'No encontramos a esta persona' }, { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });
  const db = createAdminClient();
  const now = new Date().toISOString();

  if (parsed.data.action === 'archive') {
    await db.from('personas').update({ archived_at: now, updated_at: now }).eq('id', persona.id);
    return Response.json({ ok: true });
  }
  if (parsed.data.action === 'unarchive') {
    if (!canCreatePersona(s.limits, await activeCount(s.userId)).ok) return Response.json({ error: GATE_COPY.person_limit, reason: 'person_limit' }, { status: 402 });
    await db.from('personas').update({ archived_at: null, updated_at: now }).eq('id', persona.id);
    return Response.json({ ok: true });
  }

  const described = normalizeDescribed(parsed.data.described);
  if (!described) return Response.json({ error: 'Todos los personajes son adultos.' }, { status: 400 });
  const diff = diffSpecs(persona.spec, described);
  if (!diff.changes.length) return Response.json({ ok: true, id: persona.id });

  if (diff.structural) {
    await db.from('personas').update({ archived_at: now, updated_at: now }).eq('id', persona.id);
    const id = await insertPersona(s, described, parsed.data.sourceDescription, persona.preset_id);
    return Response.json({ ok: true, id, archived: persona.id });
  }

  // Misma persona: conserva su voz, su color y su agenda (si no cambió su rutina).
  const spec = buildSpec(described, parsed.data.sourceDescription || persona.spec.sourceDescription, persona.id);
  spec.derived.voice = persona.spec.derived.voice;
  spec.derived.hue = persona.spec.derived.hue;
  const emotion = parseEmotion(persona.emotion, persona.spec.derived.temperament);
  if (diff.reset === 'openness') { emotion.openness = 0.5; emotion.trust = Math.max(0, emotion.trust - 0.2); }
  if (diff.reset === 'trust') { emotion.trust = 0.2; emotion.trustCeiling = 1; emotion.risk = false; }
  await db.from('personas').update({
    name: spec.name, bio: spec.bio, difficulty: spec.difficulty, spec, spec_version: persona.spec_version + 1,
    emotion, emotion_at: now, updated_at: now,
  }).eq('id', persona.id);
  return Response.json({ ok: true, id: persona.id });
}
