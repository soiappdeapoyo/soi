import { convertToModelMessages, createUIMessageStreamResponse, toUIMessageStream, type UIMessage } from 'ai';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, consumeChatQuery, refundChatQuery, getProfile, type ConsumeResult } from '@/lib/billing/check-access';
import { detectCrisis, detectDistress } from '@/lib/ai/crisis';
import { classifyIntent, type RouterResult } from '@/lib/ai/router';
import { streamWithFallback, AllProvidersFailedError } from '@/lib/ai/fallback';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { buildTools } from '@/lib/ai/tools';
import { recall, remember } from '@/lib/ai/rag';
import { isAgentId, type AgentId } from '@/config/agents';
import { PAYWALL_MESSAGE } from '@/config/plans';
import { detectMomentumState, momentumDirectorPrompt } from '@/lib/momentum';
import { loadMomentum, recordDailyReturn } from '@/lib/momentum-server';
import { todayCheckin } from '@/lib/today';
import { creatorMethodPrompt } from '@/lib/ai/creator-method';

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
  route ??= await classifyIntent(text, history);
  const agent: AgentId = isCrisis || route.agent === 'crisis' ? 'crisis' : isAgentId(body.agent) ? body.agent : route.agent;
  if (route.weakestLink && route.weakestLink !== profile?.weakest_link) {
    await supabase.from('user_profiles').update({ weakest_link: route.weakestLink }).eq('user_id', user.id);
  }

  // 4) RAG + accesos de herramientas
  const [memories, yt, ev, rt, ri, momentum, methods, , checkin] = await Promise.all([
    isCrisis ? Promise.resolve([]) : recall(supabase, user.id, text, {
      categories: ['perfil_usuario', 'evidencia', 'conversacion', 'manifestacion', 'afirmacion', 'pensamiento', 'emocion', 'accion', 'resultado'],
      count: 4,
    }),
    canAccess(user.id, 'youtube_embed'),
    canAccess(user.id, 'evidence_save'),
    canAccess(user.id, 'routine_execution'),
    canAccess(user.id, 'daily_ritual'),
    isCrisis ? Promise.resolve(null) : loadMomentum(supabase, user.id, profile?.streak_current ?? 0),
    isCrisis ? Promise.resolve('') : creatorMethodPrompt(supabase, user.id),
    isCrisis ? Promise.resolve() : recordDailyReturn(supabase, user.id),
    isCrisis ? Promise.resolve(null) : todayCheckin(supabase, user.id),
  ]);
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
  const system = [
    buildSystemPrompt(agent, { profile, memories, tools: toolAccess, weakestLink: route.weakestLink }),
    director,
    agent === 'crisis' ? '' : methods,
    openerText && `TU PRIMER MENSAJE EN ESTA CONVERSACIÓN FUE: "${openerText.replace(/["\n]/g, ' ').slice(0, 400)}". Continúa desde ahí sin repetir el saludo.`,
  ].filter(Boolean).join('\n\n');
  const recent = (first > 0 ? messages.slice(first) : messages).slice(-20);
  const modelMessages = recent[0]?.role === 'assistant' ? recent.slice(1) : recent;

  // 5) Persistir mensaje del usuario
  await supabase.from('messages').insert({
    conversation_id: conversationId, user_id: user.id, role: 'user', content: text, agent_category: agent,
  });

  // 6) Stream con fallback triple. Si todos los proveedores fallan, se reembolsa la consulta.
  let stream: Awaited<ReturnType<typeof streamWithFallback>>;
  try {
    stream = await streamWithFallback(
      system,
      await convertToModelMessages(modelMessages),
      agent === 'crisis' ? undefined : buildTools({ supabase, userId: user.id, authorName: profile?.display_name, access: toolAccess }),
      async ({ text: out, provider, tokens, toolCalls, toolResults }) => {
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
