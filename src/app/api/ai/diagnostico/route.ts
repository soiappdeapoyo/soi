import { getSessionUser } from '@/lib/supabase/server';
import { diagnoseProviders, CHAT_ORDER, TASK_ORDER } from '@/lib/ai/fallback';

export const dynamic = 'force-dynamic';

/**
 * Diagnóstico de la IA: prueba cada proveedor con una llamada mínima y muestra el error exacto
 * (sin claves). Requiere sesión. Útil cuando el chat responde "No pudimos responder ahora".
 */
export async function GET() {
  const { user } = await getSessionUser();
  if (!user) return new Response('Inicia sesión para ver el diagnóstico.', { status: 401 });
  const results = await diagnoseProviders();
  const hint = (r: (typeof results)[number]) => {
    if (!r.configured) return 'Sin clave configurada en este entorno.';
    if (r.ok) return 'Funciona.';
    const e = r.error ?? '';
    if (/\b(401|403)\b|API key|api_key|invalid.*key|PERMISSION_DENIED/i.test(e)) return 'Clave inválida, revocada o sin permiso: genera una nueva y actualiza la variable.';
    if (/\b429\b|quota|rate limit|RESOURCE_EXHAUSTED/i.test(e)) return 'Límite o cuota agotada en la cuenta del proveedor: espera, revisa la facturación o sube de plan.';
    if (/\b413\b|too large|tokens per minute/i.test(e)) return 'La petición supera el límite por minuto del plan gratuito.';
    if (/\b404\b|not found|decommissioned|deprecated|does not exist/i.test(e)) return 'Modelo retirado o mal escrito: cambia la variable AI_MODEL_* correspondiente.';
    return 'Error del proveedor: revisa el detalle.';
  };
  return Response.json({
    ok: results.some((r) => r.ok),
    chatOrder: CHAT_ORDER,
    taskOrder: TASK_ORDER,
    providers: results.map((r) => ({ ...r, hint: hint(r) })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
