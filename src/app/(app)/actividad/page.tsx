import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Heart, MessageCircle, Quote, Repeat2, UserPlus } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import type { PublicAuthor } from '@/lib/social/posts';
import { Avatar, shortTime } from '@/components/feed/avatar';
import { MarkRead } from '@/components/feed/mark-read';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Actividad' };

const KIND = {
  like: { icon: Heart, text: 'le gustó tu publicación', color: 'text-rose-600' },
  reply: { icon: MessageCircle, text: 'comentó', color: 'text-soi-accent' },
  restack: { icon: Repeat2, text: 'hizo restack de tu publicación', color: 'text-emerald-700' },
  quote: { icon: Quote, text: 'citó tu publicación', color: 'text-emerald-700' },
  follow: { icon: UserPlus, text: 'empezó a seguirte', color: 'text-soi-accent' },
} as const;

/** Actividad: me gusta, comentarios, restacks, citas y nuevos seguidores. Se marcan como leídas al abrir. */
export default async function ActividadPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { data } = await supabase.from('notifications').select('id, actor_id, kind, post_id, created_at, read_at')
    .eq('user_id', user.id).order('created_at', { ascending: false }).limit(60);
  const rows = (data ?? []) as { id: string; actor_id: string; kind: keyof typeof KIND; post_id: string | null; created_at: string; read_at: string | null }[];
  const { data: actors } = rows.length ? await supabase.rpc('get_public_profiles', { p_ids: [...new Set(rows.map((r) => r.actor_id))] }) : { data: [] };
  const byId = new Map(((actors ?? []) as PublicAuthor[]).map((a) => [a.user_id, a]));

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-5 md:py-8">
      <MarkRead />
      <h1 className="text-2xl font-semibold tracking-tight">Actividad</h1>
      {rows.length ? (
        <ul className="mt-3 divide-y divide-black/[0.06]">
          {rows.map((n) => {
            const a = byId.get(n.actor_id);
            const k = KIND[n.kind];
            const href = n.post_id ? `/p/${n.post_id}` : `/u/${n.actor_id}`;
            return (
              <li key={n.id}>
                <Link href={href} className={cn('press flex items-center gap-3 py-3', !n.read_at && 'font-medium')}>
                  <span className="relative">
                    <Avatar url={a?.avatar_url ?? null} name={a?.display_name ?? '?'} />
                    <span className={cn('absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-ring', k.color)}><k.icon className="h-3 w-3" aria-hidden="true" /></span>
                  </span>
                  <span className="min-w-0 flex-1 text-sm"><span className="font-medium">{a?.display_name ?? 'Alguien'}</span> {k.text}</span>
                  <time className="shrink-0 text-xs text-soi-subtle" dateTime={n.created_at}>{shortTime(n.created_at)}</time>
                  {!n.read_at && <span className="h-2 w-2 shrink-0 rounded-full bg-soi-accent-fill" aria-label="Sin leer" />}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : <p className="py-10 text-center text-sm text-soi-muted">Cuando alguien interactúe contigo lo verás aquí.</p>}
    </div>
  );
}
