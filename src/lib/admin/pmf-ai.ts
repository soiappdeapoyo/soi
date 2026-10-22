import { textWithFallback, type ProviderName } from '@/lib/ai/fallback';
import type { PmfSnapshot } from '@/lib/admin/pmf';

/**
 * La IA lee el análisis por reglas y la foto de los datos y escribe su propia lectura de PMF, con tareas
 * concretas para pegar en Claude Code. Solo cifras agregadas: nunca contenido de nadie.
 */

/** Dónde vive cada cosa, para que las recomendaciones apunten a archivos reales. */
const APP_MAP = `
- Landing y adquisición: src/app/page.tsx, LandingChat + /api/landing-chat (src/lib/landing-chat.ts), AuthorPicker, retos de 7 días (src/config/official-challenges.ts), /login, /auth/callback, /consentimiento.
- Loop principal (qué sigue): src/lib/journey.ts + journey-server.ts; Hoy (/hoy, NextStepCard); vía rápida al primer Moment (src/lib/ai/proposal-gate.ts, first_offer).
- Chat: /api/chat, router (src/lib/ai/router.ts), prompts (src/lib/ai/prompts/), saludo (src/lib/opener.ts, opener-hooks.ts, opener-ai.ts), herramientas (src/lib/ai/tools.ts).
- Moments: diseño y pulido (src/lib/moments/polish.ts, enrich.ts), reproductor (src/components/moments/moment-player.tsx), retomar (src/lib/moments/progress.ts), Mi día (src/lib/day-plan.ts).
- Retorno: recordatorios y push (src/lib/reminders.ts, /api/cron/reminders), instalar la app (ReturnSetup), hábitos (src/lib/ai/habit-memory.ts), lo que funciona y abandono (src/lib/what-works.ts).
- Sistema de vida: Tu mapa (src/lib/life-map.ts), plan de 90 días (src/lib/life-plan.ts), revisión semanal (/mapa/semana), capítulos (src/lib/chapters.ts), Mi Nuevo Yo (src/lib/identity/), Batallas (src/lib/battles.ts).
- Monetización: /planes, src/lib/billing/access-rules.ts, check-access.ts, <LockedFeature>, ajustes de prueba y precios (/panel/ajustes, src/lib/settings.ts).
- Medición: src/lib/admin/outcomes.ts, src/lib/analytics/funnel.ts y nav.ts, src/lib/admin/pmf.ts (estas reglas).`;

const INSTRUCTIONS = `Eres una líder de producto experta en product-market fit de apps de consumo por suscripción (bienestar y hábitos).
Usas: la curva de retención que se aplana (Brian Balfour), la señal de Sean Ellis, activación y momento ajá, North Star con métricas de entrada,
AARRR, árbol de oportunidades y supuestos (Teresa Torres) y priorización ICE.

Producto: SOI, app en español (LATAM, España y USA hispano; 25–45 años, mayoritariamente mujeres) de bienestar con IA. Principio: pensamientos → emociones → acciones → resultados.
La unidad central es el Moment (práctica guiada de 3–15 min que la IA diseña en el chat). Prueba de 7 días; luego Free (20 consultas) o SOI+ ($4.99/mes, $29.99/año).
Principios que no se rompen: sin culpa ni castigo, la crisis siempre tiene prioridad, sin ventas agresivas, la IA no sustituye terapia.

Mapa de la app:${APP_MAP}

Reglas:
- No inventes datos. Usa solo las cifras dadas. Si una muestra es pequeña, dilo y baja la confianza.
- Puedes discrepar de las reglas: di en qué y por qué.
- Español neutro, directo, sin relleno. Formato Markdown.

Estructura obligatoria:
# Lectura de PMF de SOI (IA)
## Diagnóstico — tu veredicto (Pre-PMF / En camino / PMF) y confianza (alta, media, baja), en 3–5 frases.
## Lo que las reglas no ven — cruces entre métricas, contradicciones y lo que falta medir.
## Cuello de botella e hipótesis — el eslabón que más frena y 2–3 hipótesis de por qué, cada una con el supuesto a validar.
## Recomendaciones priorizadas — tabla: # | Cambio en la app | Dónde (archivos del mapa) | Métrica que debe moverse | ICE (1–10 cada uno).
## Experimentos — 2–3 experimentos de 1–2 semanas con éxito definido.
## North Star — la métrica y 3–4 métricas de entrada, con su valor actual si se puede calcular.
## Tareas para Claude Code — lista numerada de tareas concretas y acotadas, cada una con archivos a tocar y criterio de terminado, lista para pegar en Claude Code en el repo de SOI.`;

export async function aiPmfReading(rulesText: string, snapshot: PmfSnapshot | null): Promise<{ text: string; provider: ProviderName }> {
  const prompt = `Análisis por reglas:\n\n${rulesText}\n\nFoto de los datos (JSON, solo cifras agregadas):\n${JSON.stringify(snapshot ?? {}, null, 1)}`;
  return textWithFallback({ instructions: INSTRUCTIONS, prompt, timeoutMs: 100_000 });
}
