import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { loadThread } from '@/lib/social/posts';
import { ThreadView } from '@/components/feed/thread-view';

export const metadata: Metadata = { title: 'Publicación' };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/login?next=/p/${id}`);
  const [thread, { profile, access }] = await Promise.all([loadThread(supabase, user.id, id), getAccessMap(user.id)]);
  if (!thread) notFound();
  const me = { name: profile?.display_name ?? 'Tú', avatarUrl: profile?.avatar_url ?? null };
  return (
    <div className="mx-auto max-w-2xl px-4 py-4 sm:px-5 md:py-8">
      <Link href="/impulso" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Impulso</Link>
      <div className="mt-2">
        <ThreadView post={thread.post} replies={thread.replies} me={me} canInteract={access.community} />
      </div>
    </div>
  );
}
