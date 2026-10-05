import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { MomentBuilder, type BuilderMoment } from '@/components/moments/moment-builder';
import { OFFICIAL_MOMENTS } from '@/config/official-moments';
import { getMoment, fullBlocks } from '@/lib/moments/server';
import { parseBlocks, type ActionBlock } from '@/config/actions';
import type { SoiMoment } from '@/types/database';
import { blockConfigFor, type GuidedContent } from '@/lib/guided';

export const metadata: Metadata = { title: 'Crear Moment' };

/** Constructor de Moments. ?editar=<id> edita uno propio; ?idea=<id> parte de una Idea guardada. */
export default async function NuevoMomentPage({ searchParams }: { searchParams: Promise<{ editar?: string; idea?: string; recurso?: string }> }) {
  const { editar, idea, recurso } = await searchParams;
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
  } else if (recurso) {
    // Un recurso de la biblioteca (meditación, afirmaciones, manifestación) → Moment con respiración de llegada, el recurso y un cierre.
    const { data } = await supabase.from('library_items').select('id, kind, title, metadata').eq('id', recurso).eq('user_id', user.id)
      .in('kind', ['meditation', 'affirmations', 'manifestation']).maybeSingle();
    if (data) {
      const b = blockConfigFor({ kind: data.kind, content: data.metadata } as GuidedContent, data.id as string);
      const meta = data.metadata as { intention?: string; minutes?: number };
      initial = {
        title: (data.title as string).slice(0, 120), objective: (meta.intention ?? data.title as string).slice(0, 500),
        kind: data.kind === 'meditation' ? 'recovery' : 'growth', source: b.source.slice(0, 200),
        blocks: [
          { id: 'r1', type: 'breathing', title: 'Llega a tu respiración', minutes: 1, config: { inhale: 4, exhale: 6 } },
          { id: 'r2', type: b.type, title: b.title.slice(0, 120), minutes: meta.minutes ?? (b.type === 'meditation' ? 5 : 3), config: b.config, source: b.source.slice(0, 160) },
          { id: 'r3', type: 'reflection', title: '¿Qué te llevas?', minutes: 2, config: { question: '¿Qué cambió en ti después de esto?' } },
        ],
      };
    }
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
