import { notFound, redirect } from 'next/navigation';
import type { UIMessage } from 'ai';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { ChatView } from '@/components/chat/chat-view';
import { isAgentId } from '@/config/agents';

type StoredToolResult = { type?: string; toolCallId?: string; toolName?: string; input?: unknown; output?: unknown };

function toolParts(stored: unknown): UIMessage['parts'] {
  if (!Array.isArray(stored)) return [];
  return (stored as StoredToolResult[])
    .filter((t) => t?.toolName && t.toolCallId && t.output !== undefined && (t.type ?? 'tool-result') === 'tool-result')
    .map((t) => ({ type: `tool-${t.toolName}`, toolCallId: t.toolCallId!, state: 'output-available', input: t.input ?? {}, output: t.output }) as UIMessage['parts'][number]);
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');

  const { data: conv } = await supabase.from('conversations').select('id, agent_category').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!conv) notFound();

  const [{ data: rows }, { profile, access }] = await Promise.all([
    supabase.from('messages').select('id, role, content, tool_results, created_at')
      .eq('conversation_id', id).in('role', ['user', 'assistant']).order('created_at', { ascending: true }).limit(200),
    getAccessMap(user.id),
  ]);

  // Las tarjetas (Moment propuesto, contenido guiado, video…) se reconstruyen desde los resultados de herramientas guardados:
  // sin esto, al volver a la conversación desaparecían los Moments que SOI preparó.
  const initialMessages: UIMessage[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    role: r.role as 'user' | 'assistant',
    parts: [
      ...(r.role === 'assistant' ? toolParts(r.tool_results) : []),
      ...(r.content && r.content !== '…' ? [{ type: 'text' as const, text: r.content as string }] : []),
    ],
  })).filter((m) => m.parts.length);

  return (
    <ChatView
      conversationId={id}
      initialMessages={initialMessages}
      agent={isAgentId(conv.agent_category) && conv.agent_category !== 'crisis' ? conv.agent_category : undefined}
      paywalled={!access.chat}
      ttsAllowed={access.tts && (profile?.tts_enabled ?? true)}
      voice={profile?.voice_preference}
    />
  );
}
