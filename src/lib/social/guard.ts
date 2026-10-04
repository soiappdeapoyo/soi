import { moderatePost, MODERATION_COPY } from '@/lib/ai/moderation';

/** Modera el texto visible de Moments y Blueprints antes de hacerlo público. */
export async function moderateFields(fields: (string | null | undefined)[]) {
  const text = fields.filter(Boolean).join('\n').slice(0, 4000);
  if (!text) return null;
  const mod = await moderatePost(text);
  if (mod.allowed) return null;
  return Response.json(
    { ok: false, reason: mod.reason, message: MODERATION_COPY[mod.reason] ?? 'El contenido no cumple las reglas de la comunidad.' },
    { status: 422 },
  );
}

export function rpcError(message: string) {
  if (message.includes('purchase_required')) return Response.json({ ok: false, message: 'Este Blueprint es premium.' }, { status: 402 });
  if (message.includes('not found')) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  return Response.json({ ok: false, message: 'No se pudo completar. Intenta de nuevo.' }, { status: 500 });
}
