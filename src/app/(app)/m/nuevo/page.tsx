import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { MomentBuilder, type BuilderMoment } from '@/components/moments/moment-builder';
import { OFFICIAL_MOMENTS } from '@/config/official-moments';
import { getMoment, fullBlocks } from '@/lib/moments/server';
import { parseBlocks, type ActionBlock } from '@/config/actions';
import type { SoiMoment } from '@/types/database';

export const metadata: Metadata = { title: 'Crear Moment' };

/** Constructor de Moments. ?editar=<id> edita uno propio; ?idea=<id> parte de una Idea guardada. */
export default async function NuevoMomentPage({ searchParams }: { searchParams: Promise<{ editar?: string; idea?: string }> }) {
  const { editar, idea } = await searchParams;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const [profile, { data: creator }, { data: own }] = await Promise.all([
    getProfile(user.id),
    supabase.from('creator_profiles').select('display_name').eq('user_id', user.id).maybeSingle(),
    supabase.from('soi_blueprints').select('id, title').eq('creator_id', user.id).neq('status', 'archived').order('updated_at', { ascending: false }).limit(20),
  ]);

  let initial: BuilderMoment | null = null;
  if (editar) {
    const m = await getMoment(supabase, editar);
    if (!m || m.creator_id !== user.id) redirect('/m/nuevo');
    initial = { id: m.id, title: m.title, objective: m.objective, kind: m.kind, source: m.source, blocks: (await fullBlocks(supabase, m)) ?? m.blocks, durationDays: m.duration_days, cover: m.cover };
  } else if (idea) {
    const { data } = await supabase.from('soi_moments').select('title, insight, actions, source_reference, category').eq('id', idea).eq('creator_id', user.id).maybeSingle();
    const i = data as Pick<SoiMoment, 'title' | 'insight' | 'actions' | 'source_reference'> | null;
    if (i) {
      const fromActions = parseBlocks(i.actions.map((a, n) => ({ id: `a${n}`, type: 'timer', title: a.title, minutes: a.minutes, config: { instruction: a.detail ?? a.title } }))).blocks;
      const blocks: ActionBlock[] = [
        { id: 'refl', type: 'reflection', title: 'Recuerda la idea', minutes: 2, config: { question: i.insight.slice(0, 300) } },
        ...fromActions,
      ];
      initial = { title: i.title, objective: i.insight.slice(0, 500), kind: 'learning', source: i.source_reference ?? 'Idea propia', blocks };
    }
  }

  const nestable = [
    ...OFFICIAL_MOMENTS.map((m) => ({ value: `slug:${m.slug}`, label: `${m.title} · ${m.author}` })),
    ...((own ?? []) as { id: string; title: string }[]).filter((m) => m.id !== editar).map((m) => ({ value: `id:${m.id}`, label: m.title })),
  ];

  return (
    <div className="mx-auto max-w-2xl px-5 pb-6 md:pb-8">
      <MomentBuilder initial={initial} nestable={nestable} isCreator={Boolean(creator)}
        creatorName={(creator?.display_name as string | undefined) ?? profile?.display_name ?? 'ti'} />
    </div>
  );
}
