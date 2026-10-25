import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { avatarFor, getPersonsSession, loadPersona } from '@/lib/persons/server';
import { loadCoachState } from '@/lib/persons/coach-server';
import { evaluateAccess } from '@/lib/billing/access-rules';
import { CoachChat } from '@/components/persons/coach-chat';
import type { Gender } from '@/lib/persons/spec';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Tu coach' };

/** El chat con el coach de un personaje. `?feedback=1`: al abrir, termina la sesión y deja el feedback. */
export default async function CoachPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ feedback?: string }> }) {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const persona = await loadPersona(s.userId, (await params).id);
  if (!persona) notFound();
  const initial = await loadCoachState(persona);
  return (
    <CoachChat
      personaId={persona.id}
      persona={{ name: persona.name, gender: persona.spec.gender as Gender, hue: persona.hue, avatar: avatarFor(persona) }}
      initial={initial} autoFeedback={(await searchParams).feedback === '1'}
      gate={!evaluateAccess(s.profile, 'chat').allowed}
    />
  );
}
