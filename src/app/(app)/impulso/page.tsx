import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { Plus, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { LockedFeature } from '@/components/paywall/locked-feature';
import { buttonClass } from '@/components/ui/button';
import { MomentCard } from '@/components/social/moment-card';
import { BlueprintCard } from '@/components/social/blueprint-card';
import { ActionCardView } from '@/components/chat/action-card-view';
import { Tendencias, Empty } from '@/components/social/feed-sections';
import { BLUEPRINT_FIELDS, creatorsById, loadFeed, myInteractions, type FeedItem } from '@/lib/social/queries';
import type { SoiBlueprint } from '@/types/database';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Impulso' };

const TABS = [
  { id: 'para-ti', label: 'Para ti' },
  { id: 'tendencias', label: 'Tendencias' },
] as const;

type Evidence = { id: string; content: string; author_name: string | null; is_anonymous: boolean; created_at: string };
type Item =
  | FeedItem
  | { type: 'evidence'; item: Evidence }
  | { type: 'action'; item: { id: string; title: string; minutes: number; area: string | null } };

/**
 * Impulso: un flujo diseñado para mantener el momentum, no una red social tradicional.
 * Mezcla transformaciones de otros (Moments), sistemas para implementar (Blueprints), evidencias de la comunidad
 * y TU siguiente acción, intercalada para que inspirarse siempre desemboque en hacer.
 * Paginado con "Ver más": sin scroll infinito ni métricas de vanidad.
 */
export default async function ImpulsoPage({ searchParams }: { searchParams: Promise<{ tab?: string; antes?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === 'tendencias' ? 'tendencias' : 'para-ti';
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { access, profile } = await getAccessMap(user.id);

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:py-8">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Impulso</h1>
          <p className="text-soi-muted">Lo que está transformando vidas, para que también actúes.</p>
        </div>
        <Link href="/momentos/nuevo" className={buttonClass('primary', 'sm')}><Plus className="h-4 w-4" aria-hidden="true" /> Momento</Link>
      </header>

      <nav aria-label="Secciones" className="mt-5 grid grid-cols-2 gap-1 rounded-[14px] bg-soi-sidebar p-1.5">
        {TABS.map((t) => (
          <Link key={t.id} href={`/impulso?tab=${t.id}`} aria-current={tab === t.id ? 'page' : undefined}
            className={cn('press flex h-9 items-center justify-center rounded-lg text-sm',
              tab === t.id ? 'bg-white text-soi-ink shadow-ring' : 'text-soi-muted hover:text-soi-ink')}>
            {t.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5">
        {!access.community ? (
          <LockedFeature title="Impulso" description="Descubre e implementa las transformaciones que están cambiando vidas en SOI. Tu biblioteca sigue en Mi Vida." />
        ) : tab === 'tendencias' ? (
          <Tendencias supabase={supabase} />
        ) : (
          <ParaTi supabase={supabase} userId={user.id} before={sp.antes} weakestLink={profile?.weakest_link ?? null} />
        )}
      </div>
    </div>
  );
}

type Sb = Awaited<ReturnType<typeof getSessionUser>>['supabase'];

async function ParaTi({ supabase, userId, before, weakestLink }: { supabase: Sb; userId: string; before?: string; weakestLink: string | null }) {
  const firstPage = !before;
  const [{ items, nextBefore }, { data: evidence }, { data: actions }, { data: recommended }] = await Promise.all([
    loadFeed(supabase, { before, weakestLink }),
    supabase.from('community_posts').select('id, content, author_name, is_anonymous, created_at')
      .eq('type', 'evidencia').eq('is_public', true).eq('flagged', false)
      .lt('created_at', before ?? new Date().toISOString()).order('created_at', { ascending: false }).limit(3),
    firstPage
      ? supabase.from('agent_knowledge').select('id, title, metadata').eq('user_id', userId).eq('category', 'accion')
        .contains('tags', ['action_card']).eq('status', 'en_progreso').order('created_at', { ascending: false }).limit(1)
      : Promise.resolve({ data: [] as { id: string; title: string; metadata: unknown }[] }),
    firstPage && weakestLink
      ? supabase.from('soi_blueprints').select(BLUEPRINT_FIELDS).eq('status', 'published').eq('eslabon', weakestLink)
        .order('implementations_count', { ascending: false }).limit(2)
      : Promise.resolve({ data: [] as SoiBlueprint[] }),
  ]);

  // Mezcla: feed base + evidencias cada 4 elementos + tu siguiente acción en 2º lugar + recomendados para tu eslabón.
  const seen = new Set(items.filter((x) => x.type === 'blueprint').map((x) => x.item.id));
  const merged: Item[] = [...items];
  ((recommended ?? []) as SoiBlueprint[]).filter((b) => !seen.has(b.id)).forEach((b, i) => merged.splice(Math.min(1 + i * 5, merged.length), 0, { type: 'blueprint', item: b }));
  ((evidence ?? []) as Evidence[]).forEach((e, i) => merged.splice(Math.min(3 + i * 4, merged.length), 0, { type: 'evidence', item: e }));
  const next = (actions ?? [])[0];
  if (next) {
    const m = (next.metadata ?? {}) as { minutes?: number; area?: string | null };
    merged.splice(Math.min(1, merged.length), 0, { type: 'action', item: { id: next.id as string, title: next.title as string, minutes: m.minutes ?? 5, area: m.area ?? null } });
  }

  const [creators, mine] = await Promise.all([
    creatorsById(supabase, merged.filter((x) => x.type === 'blueprint').map((x) => (x.item as SoiBlueprint).creator_id)),
    myInteractions(supabase, userId, merged.filter((x) => x.type === 'moment').map((x) => x.item.id)),
  ]);

  if (!merged.length) return <Empty text="Aún no hay transformaciones compartidas. Sé la primera persona en convertir una idea en acción." />;

  return (
    <>
      <ul className="flex flex-col gap-3">
        {merged.map((x) => (
          <li key={`${x.type}-${x.item.id}`}>
            {x.type === 'moment' && <MomentCard m={x.item} mine={{ resonance: mine.has(`${x.item.id}:resonance`), save: mine.has(`${x.item.id}:save`) }} />}
            {x.type === 'blueprint' && <BlueprintCard bp={x.item} creator={creators.get(x.item.creator_id)} />}
            {x.type === 'evidence' && (
              <article className="rounded-[20px] bg-white p-4 shadow-ring">
                <p className="flex items-center gap-1.5 text-xs text-soi-muted">
                  <Star className="h-3.5 w-3.5 text-soi-gold" aria-hidden="true" />
                  Evidencia · {x.item.is_anonymous ? 'Alma anónima' : (x.item.author_name ?? 'Alguien de SOI')} · {formatDistanceToNow(new Date(x.item.created_at), { addSuffix: true, locale: es })}
                </p>
                <p className="mt-2 text-[15px] leading-relaxed">{x.item.content}</p>
              </article>
            )}
            {x.type === 'action' && (
              <section aria-label="Tu siguiente acción" className="rounded-[20px] bg-soi-sidebar p-3">
                <p className="px-1 text-xs font-medium text-soi-muted">Tu siguiente acción</p>
                <ActionCardView card={{ id: x.item.id, title: x.item.title, minutes: x.item.minutes, detail: null, category: x.item.area, done: false }} />
              </section>
            )}
          </li>
        ))}
      </ul>
      {nextBefore && (
        <div className="mt-5 text-center">
          <Link href={`/impulso?antes=${encodeURIComponent(nextBefore)}`} className={buttonClass('outline', 'sm')}>Ver más</Link>
        </div>
      )}
    </>
  );
}
