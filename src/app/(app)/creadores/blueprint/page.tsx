import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { BlueprintForm, type BlueprintSeed } from '@/components/social/blueprint-form';
import { SOURCE_TYPES } from '@/config/creators';
import type { SoiMoment } from '@/types/database';

export const metadata: Metadata = { title: 'Nuevo Blueprint' };

export default async function NuevoBlueprintPage({ searchParams }: { searchParams: Promise<{ momento?: string }> }) {
  const { momento } = await searchParams;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { data: creator } = await supabase.from('creator_profiles').select('display_name').eq('user_id', user.id).maybeSingle();
  if (!creator) redirect('/creadores');

  let seed: BlueprintSeed = {};
  if (momento) {
    const { data } = await supabase.from('soi_moments').select('id, title, insight, actions, source_type, source_reference, category')
      .eq('id', momento).eq('creator_id', user.id).maybeSingle();
    const m = data as Pick<SoiMoment, 'id' | 'title' | 'insight' | 'actions' | 'source_type' | 'source_reference' | 'category'> | null;
    if (m) {
      seed = {
        momentId: m.id, title: m.title, objective: m.insight, steps: m.actions, eslabon: m.category,
        source: m.source_reference ? `${m.source_reference} (adaptado por ${creator.display_name})` : `${SOURCE_TYPES[m.source_type]} de ${creator.display_name}`,
      };
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Nuevo Blueprint</h1>
      <p className="mb-5 text-soi-muted">Un sistema reusable: cada persona recibirá una versión adaptada a su realidad.</p>
      <BlueprintForm seed={seed} creatorName={creator.display_name as string} />
    </div>
  );
}
