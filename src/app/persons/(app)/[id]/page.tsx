import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getPersonsSession, loadChatState, loadPersona } from '@/lib/persons/server';
import { evaluateAccess } from '@/lib/billing/access-rules';
import { presetById } from '@/config/persons-presets';
import { BLIND_COOKIE } from '@/config/persons';
import { ChatView } from '@/components/persons/chat-view';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Chat' };

export default async function PersonaChatPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) notFound();
  const blind = (await cookies()).get(BLIND_COOKIE)?.value === '1' && s.limits.blindMode;
  const initial = await loadChatState(persona, !blind);
  // Free sin mensajes: el chat se ve completo y el cuadro de escribir lleva a Plus (nada se borra).
  const gate = evaluateAccess(s.profile, 'chat').allowed ? null : 'exhausted';

  return (
    <ChatView
      personaId={persona.id} spec={persona.spec} hue={persona.hue}
      scenario={persona.preset_id ? presetById(persona.preset_id)?.scenario ?? null : null}
      initial={initial} gate={gate} blindAllowed={s.limits.blindMode} blind={blind}
    />
  );
}
