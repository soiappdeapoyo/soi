import { z } from 'zod/v3';
import { createAdminClient } from '@/lib/supabase/server';
import { adminFromRequest, audit } from '@/lib/admin/auth';
import { aiPmfReading } from '@/lib/admin/pmf-ai';
import { AllProvidersFailedError } from '@/lib/ai/fallback';
import type { PmfSnapshot } from '@/lib/admin/pmf';

export const maxDuration = 300;

const Body = z.object({ rulesId: z.string().uuid() });

/** La IA lee un análisis por reglas guardado y su lectura se guarda ligada a él. Solo administradores. */
export async function POST(req: Request) {
  const admin = await adminFromRequest();
  if (!admin) return new Response('No encontrado', { status: 404 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, message: 'Falta el análisis por reglas.' }, { status: 400 });

  const a = createAdminClient();
  const { data: rules } = await a.from('admin_analyses').select('id, period_days, content, snapshot')
    .eq('id', parsed.data.rulesId).eq('kind', 'rules').maybeSingle();
  if (!rules) return Response.json({ ok: false, message: 'No encontré ese análisis por reglas.' }, { status: 404 });

  try {
    const { text, provider } = await aiPmfReading(rules.content as string, rules.snapshot as PmfSnapshot);
    const { data, error } = await a.from('admin_analyses').insert({
      kind: 'ai', parent_id: rules.id, period_days: rules.period_days, content: text.slice(0, 60_000), provider, created_by: admin.id,
    }).select('id, content, provider, created_at').single();
    if (error) return Response.json({ ok: false, message: 'La IA respondió, pero no se pudo guardar.' }, { status: 500 });
    await audit(admin.id, 'analisis_pmf_ia', null, { rules: rules.id, provider });
    return Response.json({ ok: true, analysis: data });
  } catch (error) {
    const detail = error instanceof AllProvidersFailedError ? error.message.slice(0, 300) : 'error desconocido';
    return Response.json({ ok: false, message: `La IA no pudo analizar ahora (${detail}). Revisa /api/ai/diagnostico.` }, { status: 503 });
  }
}
