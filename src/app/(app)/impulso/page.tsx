import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Bell, Bookmark, Compass, Mail } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { loadForYou, loadFollowing, unreadNotifications } from '@/lib/social/posts';
import { recommendMoment, officialCounts, withOfficialCounts, getMoment } from '@/lib/moments/server';
import { MODE_KINDS } from '@/lib/moments/recommend';
import { loadToday } from '@/lib/today';
import { OFFICIAL_MOMENTS } from '@/config/official-moments';
import { FeedList } from '@/components/feed/feed-list';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import type { MomentFlow } from '@/lib/moments/types';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Impulso' };

/**
 * Impulso — la portada social de SOI (estilo Substack Home).
 * Para ti (interés + recencia) · Siguiendo (cronológico). Publicaciones con texto, imágenes y Moments como componente.
 * Arriba, una franja de Moments recomendados según tu estado: inspirarse siempre desemboca en hacer.
 */
export default async function ImpulsoPage({ searchParams }: { searchParams: Promise<{ vista?: string; compartir?: string }> }) {
  const { vista, compartir } = await searchParams;
  const following = vista === 'siguiendo';
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { profile, access } = await getAccessMap(user.id);

  const [feed, unread, today, { data: unreadDm }] = await Promise.all([
    following ? loadFollowing(supabase, user.id) : loadForYou(supabase, user.id, 0),
    unreadNotifications(supabase, user.id),
    loadToday(supabase, user.id, profile, access.daily_ritual),
    supabase.rpc('dm_unread_threads'),
  ]);
  const kinds = MODE_KINDS[today.decision.mode];
  const rec = await recommendMoment(supabase, user.id, kinds);
  const rail: MomentFlow[] = [];
  const add = (m: MomentFlow | null | undefined) => { if (m && !rail.some((x) => x.id === m.id)) rail.push(m); };
  add(rec);
  OFFICIAL_MOMENTS.filter((m) => kinds.includes(m.kind)).forEach(add);
  OFFICIAL_MOMENTS.forEach(add);
  const railC = withOfficialCounts(rail.slice(0, 4), await officialCounts(supabase));
  const sharing = compartir ? await getMoment(supabase, compartir) : null;

  const me = { name: profile?.display_name ?? 'Tú', avatarUrl: profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null };
  const cursor = following
    ? ('next' in feed && feed.next ? { kind: 'before' as const, before: feed.next } : null)
    : ('more' in feed && feed.more ? { kind: 'offset' as const, offset: feed.posts.length } : null);

  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-4 sm:px-5 md:pt-8">
      <header className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Impulso</h1>
        <nav aria-label="Atajos" className="ml-auto flex items-center gap-1">
          <Link href="/impulso/explorar" aria-label="Explorar Moments" className="press flex h-10 w-10 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink"><Compass className="h-5 w-5" aria-hidden="true" /></Link>
          <Link href="/impulso/guardados" aria-label="Guardados" className="press flex h-10 w-10 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink"><Bookmark className="h-5 w-5" aria-hidden="true" /></Link>
          <Link href="/mensajes" aria-label={unreadDm ? `Mensajes: ${unreadDm} sin leer` : 'Mensajes'} className="press relative flex h-10 w-10 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink">
            <Mail className="h-5 w-5" aria-hidden="true" />
            {Number(unreadDm) > 0 && <span className="nums absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-soi-accent-fill px-1 text-[10px] font-medium text-white">{Number(unreadDm) > 9 ? '9+' : Number(unreadDm)}</span>}
          </Link>
          <Link href="/actividad" aria-label={unread ? `Actividad: ${unread} sin leer` : 'Actividad'} className="press relative flex h-10 w-10 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink">
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unread > 0 && <span className="nums absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-soi-accent-fill px-1 text-[10px] font-medium text-white">{unread > 9 ? '9+' : unread}</span>}
          </Link>
        </nav>
      </header>

      <nav aria-label="Vista" className="mt-3 flex gap-5 border-b border-black/[0.06]">
        {[{ href: '/impulso', label: 'Para ti', on: !following }, { href: '/impulso?vista=siguiendo', label: 'Siguiendo', on: following }].map((t) => (
          <Link key={t.href} href={t.href} aria-current={t.on ? 'page' : undefined}
            className={cn('-mb-px border-b-2 py-2.5 text-sm', t.on ? 'border-soi-ink font-medium text-soi-ink' : 'border-transparent text-soi-muted hover:text-soi-ink')}>
            {t.label}
          </Link>
        ))}
      </nav>

      {!following && railC.length > 0 && (
        <section aria-label="Moments para ti" className="border-b border-black/[0.06] py-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium">Moments para ti</h2>
            <Link href="/impulso/explorar" className="text-xs text-soi-muted hover:text-soi-ink">Ver todos</Link>
          </div>
          <ul className="-mx-4 mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-5 sm:px-5">
            {railC.map((m) => <li key={m.id} className="w-[78%] shrink-0 snap-start sm:w-[46%]"><MomentFlowCard m={m} /></li>)}
          </ul>
        </section>
      )}

      <div className="pt-4">
        {!access.community && (
          <p className="mb-4 rounded-[14px] bg-soi-sidebar p-3 text-sm text-soi-muted">
            Puedes leer Impulso. Para publicar, comentar e interactuar, <Link href="/planes" className="text-soi-accent underline underline-offset-4">pasa a SOI+</Link>.
          </p>
        )}
        <FeedList
          key={following ? 'f' : 'y'}
          initial={feed.posts}
          cursor={cursor}
          query={following ? 'vista=siguiendo' : ''}
          me={me}
          composer={access.community}
          initialMoment={sharing ? { id: sharing.id, title: sharing.title } : null}
          empty={
            <p className="py-10 text-center text-soi-muted">
              {following ? <>Todavía no sigues a nadie. Descubre personas en <Link href="/impulso" className="text-soi-accent underline underline-offset-4">Para ti</Link>.</> : 'Aún no hay publicaciones. Comparte tu primer Moment.'}
            </p>
          }
        />
      </div>
    </div>
  );
}
