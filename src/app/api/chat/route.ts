import { convertToCoreMessages, type Message } from 'ai';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, decrementFreeQuery, getProfile } from '@/lib/billing/check-access';
import { detectCrisis } from '@/lib/ai/crisis';
import { classifyIntent } from '@/lib/ai/router';
import { streamWithFallback } from '@/lib/ai/fallback';
import { buildSystemPrompt } from '@/lib/ai/prompts';
import { buildTools } from '@/lib/ai/tools';
import { recall, remember } from '@/lib/ai/rag';
import { isAgentId, type AgentId } from '@/config/agents';
import { PAYWALL_MESSAGE } from '@/config/plans';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });

  const body = (await req.json()) as { messages: Message[]; conversationId?: string; agent?: string };
  const messages = body.messages ?? [];
  const last = messages.at(-1);
  const text = typeof last?.content === 'string' ? last.content.slice(0, 4000) : '';
  if (!text) return new Response('Mensaje vacío', { status: 400 });

  const profile = await getProfile(user.id);

  // 1) Crisis: SIEMPRE antes del paywall. Nunca consume consultas.
  const isCrisis = detectCrisis(text);
  if (isCrisis) {
    await remember(supabase, {
      user_id: user.id, category: 'crisis_log', title: 'Crisis detectada', content: text,
      metadata: { country: profile?.country ?? 'MX' }, withEmbedding: false,
    });
  } else {
    const access = await canAccess(user.id, 'chat');
    if (!access.allowed) {
      return Response.json({ error: PAYWALL_MESSAGE, reason: access.reason }, { status: 402 });
    }
  }

  // 2) Conversación (crea si no existe)
  let conversationId = body.conversationId;
  if (!conversationId) {
    const { data } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: text.slice(0, 60), agent_category: body.agent ?? 'general' })
      .select('id')
      .single();
    conversationId = data?.id as string;
  }

  // 3) Router + eslabón SOI. Agente elegido en sidebar se respeta (salvo crisis).
  const history = messages.slice(-5, -1).map((m) => (typeof m.content === 'string' ? m.content : ''));
  const route = await classifyIntent(text, history);
  const agent: AgentId = route.agent === 'crisis' ? 'crisis' : isAgentId(body.agent) ? body.agent : route.agent;
  if (route.weakestLink && route.weakestLink !== profile?.weakest_link) {
    await supabase.from('user_profiles').update({ weakest_link: route.weakestLink }).eq('user_id', user.id);
  }

  // 4) RAG + accesos de herramientas
  const [memories, yt, ev] = await Promise.all([
    isCrisis ? Promise.resolve([]) : recall(supabase, user.id, text, {
      categories: ['perfil_usuario', 'evidencia', 'conversacion', 'manifestacion', 'afirmacion', 'pensamiento', 'emocion', 'accion', 'resultado'],
      count: 4,
    }),
    canAccess(user.id, 'youtube_embed'),
    canAccess(user.id, 'evidence_save'),
  ]);
  const toolAccess = { youtube: yt.allowed, evidence: ev.allowed };
  const system = buildSystemPrompt(agent, { profile, memories, tools: toolAccess, weakestLink: route.weakestLink });

  // 5) Persistir mensaje del usuario
  await supabase.from('messages').insert({
    conversation_id: conversationId, user_id: user.id, role: 'user', content: text, agent_category: agent,
  });

  // 6) Stream con fallback triple
  const { result } = await streamWithFallback(
    system,
    convertToCoreMessages(messages.slice(-20)),
    agent === 'crisis' ? undefined : buildTools({ supabase, userId: user.id, access: toolAccess }),
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

  // 7) Descontar consulta (solo Free, nunca en crisis)
  if (!isCrisis) await decrementFreeQuery(user.id);

  return result.toDataStreamResponse({
    headers: {
      'x-soi-agent': agent,
      'x-soi-conversation': conversationId ?? '',
      'x-soi-weakest-link': route.weakestLink ?? '',
    },
  });
}
