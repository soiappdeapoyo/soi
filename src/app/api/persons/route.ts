import { z } from 'zod/v3';
import { DescribedSchema, normalizeDescribed } from '@/lib/persons/spec';
import { presetById } from '@/config/persons-presets';
import { activeCount, insertPersona, loadChatList, personsApiSession } from '@/lib/persons/server';
import { canCreatePersona, GATE_COPY } from '@/lib/persons/entitlements';

/** La lista de chats (se consulta cada pocos segundos para los no leídos y el aviso de mensaje nuevo). */
export async function GET(req: Request) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const archived = new URL(req.url).searchParams.get('archivados') === '1';
  return Response.json({ chats: await loadChatList(s.userId, { archived }) }, { headers: { 'Cache-Control': 'no-store' } });
}

const Body = z.union([
  z.object({ presetId: z.string().max(40) }),
  z.object({ described: DescribedSchema, sourceDescription: z.string().max(600).default('') }),
]);

/** Agrega un arquetipo de la galería o crea la persona que se previsualizó (ya generada y revisada). */
export async function POST(req: Request) {
  const s = await personsApiSession();
  if (s instanceof Response) return s;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'Datos inválidos' }, { status: 400 });

  const gate = canCreatePersona(s.limits, await activeCount(s.userId));
  if (!gate.ok) return Response.json({ error: GATE_COPY.person_limit, reason: gate.reason }, { status: 402 });

  if ('presetId' in parsed.data) {
    const preset = presetById(parsed.data.presetId);
    if (!preset) return Response.json({ error: 'No encontramos ese personaje' }, { status: 404 });
    const id = await insertPersona(s, preset.described, `Arquetipo: ${preset.scenario}`, preset.id, { localize: true });
    return Response.json({ id });
  }
  // La ficha vuelve del cliente: se revisa otra vez con las mismas reglas (edad adulta, límites, sin celebridades).
  const described = normalizeDescribed(parsed.data.described);
  if (!described) return Response.json({ error: 'Todos los personajes son adultos.' }, { status: 400 });
  const id = await insertPersona(s, described, parsed.data.sourceDescription, null);
  return Response.json({ id });
}
