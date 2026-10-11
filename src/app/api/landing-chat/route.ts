import { z } from 'zod/v3';
import { createAdminClient } from '@/lib/supabase/server';
import { FAST_ORDER, TASK_ORDER, objectWithFallback } from '@/lib/ai/fallback';
import { detectCrisis } from '@/lib/ai/crisis';
import { getCrisisResources } from '@/config/crisis-resources';
import { parseBlocks } from '@/config/actions';
import { polishMoment } from '@/lib/moments/polish';
import { partOfDay } from '@/lib/day-plan';
import { hourInTz } from '@/lib/utils';
import { geoFromHeaders, visitorFrom } from '@/lib/analytics/funnel';
import {
  LANDING_BLOCK_TYPES, cleanHistory, landingAuthor, landingPhase, stepConfig,
  type LandingAuthor, type LandingMessage,
} from '@/lib/landing-chat';

/**
 * Chat de la landing (sin cuenta): escucha, pregunta lo justo y diseña el primer Moment, que se guarda como borrador
 * (`moment_drafts`) hasta que la persona entra. Sin memoria ni herramientas: una llamada corta por mensaje.
 * Topes: por IP (en memoria), 3 Moments por visitante al día y 400 en total al día (costo).
 */

const AUTHOR: Record<LandingAuthor, string> = {
  neville: 'Neville Goddard (ley de asunción: sentir el deseo cumplido, SATS antes de dormir, revisión, dieta mental)',
  tracy: 'Brian Tracy (ritual de 5 minutos al despertar, metas escritas en presente, «Eat That Frog»: la tarea más importante primero)',
  hill: 'Napoleon Hill (Think and Grow Rich: deseo ardiente y exacto, fe, autosugestión, plan, decisión, persistencia)',
};

const BASE = (de: LandingAuthor | null, part: string) => `Eres SOI, una app de bienestar en español que convierte lo que la persona siente en una práctica guiada por voz (un "SOI Moment").
Hablas con alguien que acaba de llegar${de ? ` desde un video de TikTok de ${AUTHOR[de]}` : ' desde un video de TikTok de desarrollo personal'}. Aún no tiene cuenta. Ahora es ${part} para la persona.
Principio de SOI: los pensamientos lideran las emociones, las emociones las acciones y las acciones los resultados.
Estilo: español neutro latinoamericano, cálido y breve, lenguaje neutro en género (nada de "estancada/o", "cansado"); usa sus palabras. Nunca diagnostiques, prometas resultados ni sustituyas terapia. No menciones planes, precios ni registro.`;

const AskSchema = z.object({
  reply: z.string().describe('1 o 2 frases: refleja lo que contó con sus palabras y haz UNA sola pregunta'),
});

const STEP_TYPES = LANDING_BLOCK_TYPES as unknown as [string, ...string[]];
const DesignSchema = z.object({
  reply: z.string().describe('Una frase: "Entiendo que…" con sus palabras, y que le preparaste esto'),
  title: z.string().describe('Nombre que nombra SU situación, 2 a 6 palabras (no "Calma")'),
  objective: z.string().describe('El cambio que busca, en una frase'),
  kind: z.enum(['recovery', 'growth', 'daily']).describe('recovery: ansiedad, tristeza, enfoque; growth: metas; daily: hábito diario'),
  source: z.string().describe('Autores en los que se basa, p. ej. "Diseñado por SOI · basado en Neville Goddard"'),
  anxious: z.boolean().describe('true si hoy llega con ansiedad o agitación'),
  situation: z.string().describe('Qué le pasa, con sus palabras'),
  wants: z.string().describe('Qué quiere sentir o lograr'),
  steps: z.array(z.object({
    type: z.enum(STEP_TYPES),
    title: z.string().describe('2 a 6 palabras'),
    minutes: z.number().int().describe('1 a 5'),
    text: z.string().optional().describe('El contenido que la voz leerá (ver la guía de cada tipo)'),
    pattern: z.enum(['calma', 'caja', '478', 'coherencia']).optional().describe('Solo breathing'),
    source: z.string().optional().describe('Autor y obra de la técnica, si aplica'),
  })).describe('3 a 6 pasos'),
});

const DESIGN_GUIDE = `Diseña su primer SOI Moment: 4 a 8 minutos en total, 3 a 6 pasos, ÚNICO para esta persona.
Arco: 1) Llegar (breathing con pattern: calma para soltar, 478 de noche, caja para enfocar, coherencia para equilibrar; o body_scan). 2) Núcleo: 1 o 2 pasos de la técnica que encaja${'{AUTOR}'}. 3) Integrar: una pregunta (reflection) o escritura breve (writing). 4) Llevarlo a la vida: next_step concreto (qué y cuándo) o celebration.
Qué va en "text" según el tipo: visualization → la escena en segunda persona, presente, sensorial, 4 a 6 frases cortas, del deseo YA cumplido; meditation → guion breve; affirmation → una afirmación en primera persona y presente, creíble hoy; reframe → SU pensamiento tal como lo dijo; writing/goal → la consigna; reflection → la pregunta; next_step/timer/walk/rest → la instrucción; celebration → un mensaje corto; letter → la consigna. breathing, body_scan y gratitude no llevan text.
La voz lee todo: frases cortas y naturales, con sus palabras, su meta, su hora. Cita en "source" del paso la obra del autor cuando uses su técnica (p. ej. "Neville Goddard, Feeling is the Secret"). No inventes técnicas.`;

const NUCLEUS: Record<LandingAuthor, string> = {
  neville: ' (de preferencia Neville: visualization del deseo cumplido estilo SATS, o affirmation en presente)',
  tracy: ' (de preferencia Brian Tracy: goal o writing de la meta en presente y next_step con la tarea más importante)',
  hill: ' (de preferencia Napoleon Hill: goal con el deseo exacto, affirmation como autosugestión, next_step del plan)',
};

/* ---------- Topes ---------- */

const hits = new Map<string, number[]>();
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 14;
function limited(key: string) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear(); // memoria acotada
  return recent.length > MAX_PER_WINDOW;
}

const Body = z.object({
  messages: z.unknown(),
  de: z.string().max(12).nullish(),
  vid: z.string().max(64).nullish(),
  tz: z.string().max(64).nullish(),
});

function validTz(tz: string | null | undefined) {
  if (!tz) return 'America/Mexico_City';
  try { new Intl.DateTimeFormat('es', { timeZone: tz }); return tz; } catch { return 'America/Mexico_City'; }
}

const PART: Record<string, string> = { manana: 'la mañana', tarde: 'la tarde', noche: 'la noche' };

const transcript = (h: LandingMessage[]) => h.map((m) => `${m.role === 'user' ? 'Persona' : 'SOI'}: ${m.text}`).join('\n');

export async function POST(req: Request) {
  const host = new URL(req.url).host;
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== host) return new Response(null, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  const history = parsed.success ? cleanHistory(parsed.data.messages) : null;
  if (!parsed.success || !history) return Response.json({ error: 'Mensaje inválido.' }, { status: 400 });

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  if (limited(ip)) return Response.json({ error: 'Vas muy rápido. Espera un momento y vuelve a intentarlo.' }, { status: 429 });

  const de = landingAuthor(parsed.data.de);
  const visitor = visitorFrom(parsed.data.vid);
  const geo = geoFromHeaders(req.headers);
  const db = createAdminClient();
  // Embudo del chat (/panel/analytics): sin contenido, solo qué pasó.
  const mark = async (event: 'chat_moment' | 'chat_crisis' | 'chat_error', detail: string | null) => {
    const { error } = await db.from('funnel_events').insert({ visitor_id: visitor, event, detail, ...geo });
    if (error) console.error('[landing-chat] embudo', error.message);
  };

  // Crisis: sin IA y sin Moment. Primero, una persona.
  if (history.some((m) => m.role === 'user' && detectCrisis(m.text))) {
    await mark('chat_crisis', null);
    return Response.json({
      crisis: true,
      reply: 'Gracias por contármelo. Lo que sientes es importante y no tienes que cargarlo en soledad. Ahora mismo lo mejor es hablar con una persona: llama a una de estas líneas, son gratuitas y confidenciales. Si estás en peligro inmediato, llama a emergencias (911).',
      resources: getCrisisResources(geo.country),
    });
  }

  const tz = validTz(parsed.data.tz);
  const part = partOfDay(hourInTz(tz));
  const base = BASE(de, PART[part] ?? 'el día');

  if (landingPhase(history) === 'ask') {
    try {
      const { object } = await objectWithFallback({
        schema: AskSchema,
        instructions: `${base}
Tu trabajo ahora: escuchar. Valida lo que contó con sus palabras (sin repetirlo entero) y haz UNA pregunta para diseñarle algo a su medida: qué quiere sentir al terminar, o qué pensamiento se le repite, o cuándo quiere hacerlo. No propongas nada todavía. Máximo 2 frases.`,
        prompt: transcript(history),
        order: FAST_ORDER, timeoutMs: 12_000, maxOutputTokens: 300,
      });
      const reply = object.reply.trim().slice(0, 400);
      if (reply) return Response.json({ reply });
    } catch (e) {
      console.error('[landing-chat] pregunta', e instanceof Error ? e.message : e);
    }
    return Response.json({ reply: 'Te entiendo. ¿Qué te gustaría sentir al terminar estos minutos?' });
  }

  // Diseñar: topes de costo antes de llamar a la IA.
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const [{ count: mine }, { count: today }] = await Promise.all([
    visitor ? db.from('moment_drafts').select('id', { count: 'exact', head: true }).eq('visitor_id', visitor).gte('created_at', since) : Promise.resolve({ count: 0 }),
    db.from('moment_drafts').select('id', { count: 'exact', head: true }).gte('created_at', since),
  ]);
  if ((mine ?? 0) >= 3) { await mark('chat_error', 'limite'); return Response.json({ error: 'Ya te diseñé varios Moments hoy. Entra a SOI para seguir: ahí lo afinamos juntos.' }, { status: 429 }); }
  if ((today ?? 0) >= 400) { await mark('chat_error', 'saturado'); return Response.json({ error: 'Hoy hay mucha gente diseñando su Moment. Elige uno de los retos de arriba y empieza ya.' }, { status: 503 }); }

  try {
    const { object: m } = await objectWithFallback({
      schema: DesignSchema,
      instructions: `${base}\n\n${DESIGN_GUIDE.replace('{AUTOR}', de ? NUCLEUS[de] : '')}`,
      prompt: transcript(history),
      order: TASK_ORDER, timeoutMs: 30_000,
    });
    const steps = m.steps.slice(0, 6).map((s, i) => ({
      id: `b${i + 1}`, type: s.type, title: s.title.trim().slice(0, 80) || 'Paso',
      minutes: Math.min(5, Math.max(1, Math.round(s.minutes || 1))),
      config: stepConfig(s as Parameters<typeof stepConfig>[0]),
      ...(s.source?.trim() ? { source: s.source.trim().slice(0, 160) } : {}),
    }));
    const { blocks: valid } = parseBlocks(steps);
    if (valid.length < 2) throw new Error(`solo ${valid.length} pasos válidos`);
    const { blocks } = polishMoment(valid, { anxiety: m.anxious });
    const title = m.title.trim().slice(0, 80) || 'Tu primer Moment';
    const objective = m.objective.trim().slice(0, 300) || title;
    const source = (m.source.trim() || 'Diseñado por SOI').slice(0, 200);

    const { data, error } = await db.from('moment_drafts').insert({
      visitor_id: visitor, author: de, title, objective, kind: m.kind, source, blocks,
      context: `${m.situation}. ${m.wants}`.slice(0, 1000), part,
    }).select('id').single();
    if (error || !data) throw new Error(error?.message ?? 'sin borrador');

    await mark('chat_moment', de ?? 'general');

    return Response.json({
      reply: m.reply.trim().slice(0, 400) || 'Te preparé esto.',
      moment: {
        token: data.id as string, title, objective, source,
        minutes: blocks.reduce((a, b) => a + b.minutes, 0),
        steps: blocks.map((b) => ({ type: b.type, title: b.title, minutes: b.minutes })),
      },
    });
  } catch (e) {
    console.error('[landing-chat] diseño', e instanceof Error ? e.message : e);
    await mark('chat_error', 'ia');
    return Response.json({ error: 'No pude terminar tu Moment ahora. Inténtalo otra vez en un momento.', retry: true }, { status: 503 });
  }
}
