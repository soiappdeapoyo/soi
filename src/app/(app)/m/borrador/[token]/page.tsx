import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { claimDraft } from '@/lib/moments/drafts';
import { VISITOR_COOKIE, visitorFrom } from '@/lib/analytics/funnel';
import { draftPath } from '@/lib/landing-chat';

export const metadata: Metadata = { title: 'Tu Moment', robots: { index: false } };

/** Después de entrar desde el chat de la landing: el Moment que SOI le diseñó se guarda como suyo y empieza. */
export default async function ClaimDraftPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(draftPath(token))}`);
  const visitor = visitorFrom((await cookies()).get(VISITOR_COOKIE)?.value);
  const id = await claimDraft(supabase, user.id, token, visitor);
  // Enlace vencido o de otra cuenta: a su primer paso de siempre.
  redirect(id ? `/m/${id}/play` : '/chat?nueva=1');
}
