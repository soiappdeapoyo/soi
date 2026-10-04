import { notFound, redirect } from 'next/navigation';
import type { UIMessage } from 'ai';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { ChatView } from '@/components/chat/chat-view';
import { isAgentId } from '@/config/agents';

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

  const initialMessages: UIMessage[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    role: r.role as 'user' | 'assistant',
    parts: [{ type: 'text', text: r.content as string }],
  }));

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
