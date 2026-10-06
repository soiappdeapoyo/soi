import { moderatePost, MODERATION_COPY, type ModerationContext } from '@/lib/ai/moderation';

/** Modera el texto visible de Ideas y Moments antes de hacerlo público. */
export async function moderateFields(fields: (string | null | undefined)[], context: ModerationContext = 'community') {
  const text = fields.filter(Boolean).join('\n').slice(0, 4000);
  if (!text) return null;
  const mod = await moderatePost(text, context);
  if (mod.allowed) return null;
  const copy = (context === 'creator' && MODERATION_COPY[`${mod.reason}_creator`]) || MODERATION_COPY[mod.reason];
  return Response.json(
    { ok: false, reason: mod.reason, message: copy ?? 'El contenido no cumple las reglas de la comunidad.' },
    { status: 422 },
  );
}

export function rpcError(message: string) {
  if (message.includes('purchase_required')) return Response.json({ ok: false, message: 'Este Moment es premium.' }, { status: 402 });
  if (message.includes('not found')) return Response.json({ ok: false, message: 'No encontrado.' }, { status: 404 });
  return Response.json({ ok: false, message: 'No se pudo completar. Intenta de nuevo.' }, { status: 500 });
}
