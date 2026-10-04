import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadSaved } from '@/lib/social/posts';
import { FeedList } from '@/components/feed/feed-list';

export const metadata: Metadata = { title: 'Guardados' };

export default async function GuardadosPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const [posts, profile] = await Promise.all([loadSaved(supabase, user.id), getProfile(user.id)]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5 md:py-8">
      <Link href="/impulso" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Impulso</Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Guardados</h1>
      <FeedList initial={posts} cursor={null} query="" me={{ name: profile?.display_name ?? 'Tú', avatarUrl: profile?.avatar_url ?? null }} composer={false}
        empty={<p className="py-10 text-center text-sm text-soi-muted">Guarda publicaciones con el marcador para volver a ellas.</p>} />
    </div>
  );
}
