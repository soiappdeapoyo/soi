import { convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from 'ai';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, consumeChatQuery, refundChatQuery, getProfile, type ConsumeResult } from '@/lib/billing/check-access';
import { detectCrisis, detectDistress } from '@/lib/ai/crisis';
import { classifyIntent, type RouterResult } from '@/lib/ai/router';
import { streamWithFallback, AllProvidersFailedError } from '@/lib/ai/fallback';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { buildTools } from '@/lib/ai/tools';
import { isCreatorAccount } from '@/lib/creators/profile';
import { PROPOSAL_RULE, proposalMode } from '@/lib/ai/proposal-gate';
import { continuityPrompt, loadContinuity } from '@/lib/ai/continuity';
import { findReusable, reusePrompt } from '@/lib/moments/reuse';

/** Cuenta de creador: su contenido es 100% suyo. SOI acompaña, no genera. */
const CREATOR_CHAT_RULE = 'CUENTA DE CREADOR: esta persona crea su propio contenido. No diseñes Moments ni escribas meditaciones, afirmaciones o manifestaciones para ella (no tienes esas herramientas). Acompáñala conversando, con preguntas; si quiere crear algo, invítala a hacerlo con su propio material en el constructor de Moments.';
import { recall, remember } from '@/lib/ai/rag';
import { isAgentId, type AgentId } from '@/config/agents';
import { PAYWALL_MESSAGE } from '@/config/plans';
import { detectMomentumState, momentumDirectorPrompt, STATE_INTERVENTION, VIDEO_RULE, videoPolicy } from '@/lib/momentum';
import { loadMomentum, recordDailyReturn } from '@/lib/momentum-server';
import { todayCheckin } from '@/lib/today';
import { creatorMethodPrompt } from '@/lib/ai/creator-method';
import { timeContextPrompt } from '@/lib/time-of-day';
import { loadHillMemory } from '@/lib/ai/hill-memory';
import { detectEnemies } from '@/config/enemies';
import { recordEnemy } from '@/lib/battles';

export const maxDuration = 60;

/** Texto plano de un mensaje UI (v7: el contenido vive en `parts`). */
function textOf(m: UIMessage | undefined): string {
  return (m?.parts ?? []).map((p) => (p.type === 'text' ? p.text : '')).join('').trim();
}

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });

  const body = (await req.json()) as { messages: UIMessage[]; conversationId?: string; agent?: string };
  const messages = body.messages ?? [];
  const last = messages.at(-1);
  const text = last?.role === 'user' ? textOf(last).slice(0, 4000) : '';
  if (!text) return new Response('Mensaje vacío', { status: 400 });

  const profile = await getProfile(user.id);
  const history = messages.slice(-5, -1).map(textOf);

  // 1) Crisis: SIEMPRE antes del paywall. Nunca consume consultas.
  //    Con señales suaves de malestar se consulta al clasificador antes de decidir; si falla, se asume crisis.
  let route: RouterResult | null = null;
  let isCrisis = detectCrisis(text);
  if (!isCrisis && detectDistress(text)) {
    route = await classifyIntent(text, history);
    isCrisis = route.agent === 'crisis' || route.confidence === 0;
  }

  // El router (agente + eslabón) corre en paralelo con el cobro de la consulta y la conversación, no antes.
  const routePromise: Promise<RouterResult> = route ? Promise.resolve(route) : classifyIntent(text, history);

  let consumed: ConsumeResult = 'unlimited';
  if (isCrisis) {
    await remember(supabase, {
      user_id: user.id, category: 'crisis_log', title: 'Crisis detectada', content: text,
      metadata: { country: profile?.country ?? 'MX' }, withEmbedding: false,
    });
  } else {
    consumed = await consumeChatQuery();
    if (consumed === 'exhausted') {
      return Response.json({ error: PAYWALL_MESSAGE, reason: 'queries_exhausted' }, { status: 402 });
    }
  }

  // 4) Contexto (memoria, accesos, Momentum, continuidad, Moments parecidos): arranca YA, en paralelo con el router
  //    y la conversación; no depende del agente.
  const contextPromise = Promise.all([
    isCreatorAccount(supabase, user.id),
    isCrisis ? Promise.resolve([]) : recall(supabase, user.id, text, {
      // Las conversaciones pasadas llegan aparte, con fecha (continuidad).
      categories: ['perfil_usuario', 'evidencia', 'manifestacion', 'afirmacion', 'pensamiento', 'emocion', 'accion', 'resultado'],
      count: 4,
    }),
    canAccess(user.id, 'youtube_embed'),
    canAccess(user.id, 'evidence_save'),
    canAccess(user.id, 'routine_execution'),
    canAccess(user.id, 'daily_ritual'),
    isCrisis ? Promise.resolve(null) : loadMomentum(supabase, user.id, profile?.streak_current ?? 0),
    isCrisis ? Promise.resolve('') : creatorMethodPrompt(supabase, user.id),
    isCrisis ? Promise.resolve() : recordDailyReturn(supabase, user.id, profile?.timezone),
    isCrisis ? Promise.resolve(null) : todayCheckin(supabase, user.id, profile?.timezone),
    isCrisis ? Promise.resolve({ data: [] }) : supabase.from('library_items').select('id, kind, title, author, status, external_id')
      .eq('user_id', user.id).order('updated_at', { ascending: false }).limit(25),
    // Continuidad y reutilizar antes de crear (reglas + embeddings; sin tokens extra del modelo).
    isCrisis ? Promise.resolve([]) : loadContinuity(supabase, user.id, text, body.conversationId).catch(() => []),
    isCrisis ? Promise.resolve([]) : findReusable(supabase, user.id, text).catch(() => []),
  ]);

  // 2) Conversación (crea si no existe). El saludo con el que SOI abrió la conversación se guarda primero.
  let conversationId = body.conversationId;
  if (!conversationId) {
    const { data } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: text.slice(0, 60), agent_category: body.agent ?? 'general' })
      .select('id')
      .single();
    conversationId = data?.id as string;
    const opener = messages[0];
    if (conversationId && opener?.role === 'assistant' && textOf(opener)) {
      await supabase.from('messages').insert({
        conversation_id: conversationId, user_id: user.id, role: 'assistant', content: textOf(opener).slice(0, 1000), agent_category: 'general',
      });
    }
  }

  // 3) Router + eslabón SOI. Agente elegido en sidebar se respeta (salvo crisis).
  route ??= await routePromise;
  const agent: AgentId = isCrisis || route.agent === 'crisis' ? 'crisis' : isAgentId(body.agent) ? body.agent : route.agent;
  if (route.weakestLink && route.weakestLink !== profile?.weakest_link) {
    // No bloquea la respuesta.
    void supabase.from('user_profiles').update({ weakest_link: route.weakestLink }).eq('user_id', user.id).then(() => undefined, () => undefined);
  }
  const [isCreator, memories, yt, ev, rt, ri, momentum, methods, , checkin, { data: libraryRows }, pastTalks, reusable] = await contextPromise;

  const toolAccess = { youtube: yt.allowed, evidence: ev.allowed, routines: rt.allowed, ritual: ri.allowed };
  // Si SOI abrió la conversación, el saludo va como contexto (algunos proveedores exigen que el historial empiece por el usuario).
  const first = messages.findIndex((m) => m.role === 'user');
  const openerText = first > 0 ? messages.slice(0, first).map(textOf).join('\n') : '';
  // Momentum Director: capa transversal sobre cualquier agente (nunca en crisis).
  // Estado: la ansiedad que aparece en el mensaje manda; si no, el check-in de hoy; si no, lo inferido.
  const detected = momentum ? detectMomentumState({
    message: text, score: momentum.score, goalsCount: profile?.goals?.length ?? 0,
    emotionalTone: route.emotionalTone, weakestLink: route.weakestLink ?? profile?.weakest_link,
  }) : null;
  const state = detected === 'anxiety' ? 'anxiety' : (checkin ?? detected);
  const director = momentum && state && agent !== 'crisis' ? momentumDirectorPrompt(state, momentum) : '';
  // Escuchar primero, proponer después (reglas): sin herramientas de propuesta hasta que lo pida o acepte.
  const userTurns = messages.filter((m) => m.role === 'user').length;
  const prev = messages.at(-2);
  const ritmo = proposalMode({ text, userTurns, previousAssistant: prev?.role === 'assistant' ? textOf(prev) : null, anxiety: state === 'anxiety' });
  // Video rápido o dentro del Moment (nunca los dos), según cómo llega.
  const video = videoPolicy(state ? STATE_INTERVENTION[state] : null, text);
  const time = timeContextPrompt(profile?.timezone ?? 'America/Mexico_City');
  const hill = agent === 'napoleon_hill' ? (await loadHillMemory(supabase, user.id)).memory : null;
  const system = [
    buildSystemPrompt(agent, {
      profile, memories, tools: toolAccess, weakestLink: route.weakestLink, hill,
      library: ((libraryRows ?? []) as { id: string; kind: 'book' | 'pdf' | 'exercise'; title: string; author: string | null; status: string; external_id: string | null }[])
        .map((r) => ({ id: r.id, kind: r.kind, title: r.title, author: r.author, status: r.status, externalId: r.external_id })),
    }),
    director,
    agent === 'crisis' ? '' : PROPOSAL_RULE[ritmo],
    agent === 'crisis' || ritmo === 'listen' || ritmo === 'invite' ? '' : VIDEO_RULE[video],
    isCreator && agent !== 'crisis' ? CREATOR_CHAT_RULE : '',
    agent === 'crisis' ? '' : continuityPrompt(pastTalks, profile?.timezone ?? 'America/Mexico_City'),
    agent === 'crisis' ? '' : reusePrompt(reusable, !isCreator),
    agent === 'crisis' ? '' : methods,
    openerText && `TU PRIMER MENSAJE EN ESTA CONVERSACIÓN FUE: "${openerText.replace(/["\n]/g, ' ').slice(0, 900)}". Continúa desde ahí sin repetir el saludo.`,
    // Lo que cambia cada minuto va al final: así la parte fija del prompt se reutiliza desde la caché del proveedor.
    time.prompt,
  ].filter(Boolean).join('\n\n');
  const recent = (first > 0 ? messages.slice(first) : messages).slice(-20);
  const modelMessages = recent[0]?.role === 'assistant' ? recent.slice(1) : recent;

  // Batallas: respaldo sin IA por frases típicas ("mañana lo hago", "¿y si sale mal?"…). La IA también puede registrar.
  if (!isCrisis) for (const enemy of detectEnemies(text)) void recordEnemy(user.id, enemy, { source: 'signals', evidence: text.slice(0, 300) }).catch(() => {});

  // 5) Persistir mensaje del usuario, en paralelo con el inicio de la respuesta (se espera antes de guardar la de SOI).
  const userSaved = supabase.from('messages').insert({
    conversation_id: conversationId, user_id: user.id, role: 'user', content: text, agent_category: agent,
  }).then(() => undefined, (e) => console.error('[chat] mensaje del usuario', e));

  // 6) Stream con fallback triple. Si todos los proveedores fallan, se reembolsa la consulta.
  let stream: Awaited<ReturnType<typeof streamWithFallback>>;
  try {
    stream = await streamWithFallback(
      system,
      await convertToModelMessages(modelMessages),
      agent === 'crisis' ? undefined : buildTools({ supabase, userId: user.id, authorName: profile?.display_name, access: toolAccess, video, creator: isCreator, proposals: ritmo === 'propose' || ritmo === 'soothe' }),
      async ({ text: out, provider, tokens, toolCalls, toolResults }) => {
        await userSaved;
        await supabase.from('messages').insert({
          conversation_id: conversationId, user_id: user.id, role: 'assistant', content: out || '…',
          agent_category: agent, provider, tokens_used: tokens,
          tool_calls: toolCalls ?? null, tool_results: toolResults ?? null,
        });
        const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true }).eq('conversation_id', conversationId);
        await supabase.from('conversations')
          .update({ last_message_at: new Date().toISOString(), agent_category: agent, message_count: count ?? 0 })
          .eq('id', conversationId);
        if (out && out.length > 120) {
          await remember(supabase, {
            user_id: user.id, category: 'conversacion', title: text.slice(0, 80), content: `${text}\n---\n${out}`.slice(0, 3000),
            metadata: { agent, conversation_id: conversationId, eslabon_soi: route.weakestLink ?? null },
          });
        }
      },
    );
  } catch (error) {
    console.error('[chat]', error instanceof AllProvidersFailedError ? error.message : error);
    await userSaved;
    if (consumed === 'consumed') await refundChatQuery();
    const noProviders = error instanceof AllProvidersFailedError && error.attempts.length === 0;
    return Response.json({
      error: noProviders
        ? 'SOI no tiene un proveedor de IA configurado. Revisa las claves de API.'
        : 'No pudimos responder ahora. Intenta de nuevo en un momento.',
    }, { status: 503 });
  }

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: stream.result.stream }),
    headers: {
      'x-soi-agent': agent,
      'x-soi-conversation': conversationId ?? '',
      'x-soi-weakest-link': route.weakestLink ?? '',
    },
  });
}
