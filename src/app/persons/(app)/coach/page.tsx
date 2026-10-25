import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { avatarFor, getPersonsSession, type PersonaRow } from '@/lib/persons/server';
import { loadCoachThread } from '@/lib/persons/coach-server';
import { createAdminClient } from '@/lib/supabase/server';
import { evaluateAccess } from '@/lib/billing/access-rules';
import { CoachChat } from '@/components/persons/coach-chat';
import type { Gender } from '@/lib/persons/spec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Ale · tu coach' };

/**
 * El chat con Ale, una conversación más de la lista. `?p=<id>`: de qué plática se habla al abrir;
 * `&feedback=1`: al abrir, termina la sesión con esa persona y deja el feedback.
 */
export default async function CoachPage({ searchParams }: { searchParams: Promise<{ p?: string; feedback?: string }> }) {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const { p, feedback } = await searchParams;
  const { data } = await createAdminClient().from('personas').select('*').eq('user_id', s.userId).is('archived_at', null)
    .order('last_message_at', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false }).limit(40);
  const personas = (data ?? []) as PersonaRow[];
  const thread = await loadCoachThread(s.userId, personas, p ?? null);
  return (
    <CoachChat
      personas={personas.map((x) => ({ id: x.id, name: x.name, gender: x.spec.gender as Gender, hue: x.hue, avatar: avatarFor(x) }))}
      initial={thread} autoFeedback={feedback === '1'}
      gate={!evaluateAccess(s.profile, 'chat').allowed}
    />
  );
}
