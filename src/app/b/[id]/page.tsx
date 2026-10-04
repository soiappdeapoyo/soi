import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { PublicShell } from '@/components/public/public-shell';
import { BlueprintDetail } from '@/components/social/blueprint-detail';
import { buttonClass } from '@/components/ui/button';
import { BLUEPRINT_FIELDS, creatorsById } from '@/lib/social/queries';
import { TRIAL_DAYS } from '@/config/plans';
import type { SoiBlueprint } from '@/types/database';

async function load(id: string) {
  const { supabase, user } = await getSessionUser();
  const { data } = await supabase.from('soi_blueprints').select(BLUEPRINT_FIELDS).eq('id', id).eq('status', 'published').maybeSingle();
  return { supabase, user, bp: data as SoiBlueprint | null };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const { bp } = await load(id);
  return bp ? { title: bp.title, description: bp.objective } : { title: 'Blueprint' };
}

/** Página pública del Blueprint: el creador la comparte en sus redes; implementarla ocurre dentro de SOI. */
export default async function BlueprintPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, bp } = await load(id);
  if (!bp) notFound();
  if (user) redirect(`/blueprints/${id}`);
  const creator = (await creatorsById(supabase, [bp.creator_id])).get(bp.creator_id);

  return (
    <PublicShell signedIn={false}>
      <BlueprintDetail bp={bp} creator={creator} creatorHref={creator ? `/c/${creator.handle}` : undefined}>
        <div className="rounded-[20px] bg-soi-sidebar p-3">
          <div className="rounded-lg bg-white p-4 shadow-ring">
            <p className="text-[15px]">SOI adapta este sistema a tu tiempo y tu realidad, y te acompaña cada día para que lo conviertas en hábito.</p>
            <Link href={`/login?next=/blueprints/${bp.id}`} className={buttonClass('primary', 'md', 'mt-3 w-full')}>Implementar en SOI</Link>
            <p className="mt-2 text-center text-xs text-soi-muted">{TRIAL_DAYS} días de prueba sin tarjeta.</p>
          </div>
        </div>
      </BlueprintDetail>
    </PublicShell>
  );
}
