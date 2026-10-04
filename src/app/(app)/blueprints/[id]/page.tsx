import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getAccessMap } from '@/lib/billing/check-access';
import { BLUEPRINT_FIELDS, creatorsById } from '@/lib/social/queries';
import { BlueprintDetail } from '@/components/social/blueprint-detail';
import { ImplementPanel } from '@/components/social/implement-panel';
import { BlueprintOwnerControls } from '@/components/social/blueprint-owner-controls';
import type { SoiBlueprint } from '@/types/database';

export const metadata: Metadata = { title: 'Blueprint' };

export default async function BlueprintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ compra?: string }> }) {
  const [{ id }, { compra }] = await Promise.all([params, searchParams]);
  const { supabase, user } = await getSessionUser();
  if (!user) redirect(`/login?next=/blueprints/${id}`);
  const { data } = await supabase.from('soi_blueprints').select(BLUEPRINT_FIELDS).eq('id', id).maybeSingle();
  if (!data) notFound();
  const bp = data as SoiBlueprint;
  const own = bp.creator_id === user.id;

  const [{ access, profile }, creators, { data: impl }, { data: purchase }] = await Promise.all([
    getAccessMap(user.id),
    creatorsById(supabase, [bp.creator_id]),
    supabase.from('blueprint_implementations').select('id').eq('blueprint_id', id).eq('user_id', user.id).maybeSingle(),
    supabase.from('blueprint_purchases').select('id').eq('blueprint_id', id).eq('user_id', user.id).maybeSingle(),
  ]);
  const creator = creators.get(bp.creator_id);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/impulso" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Impulso</Link>
      {compra === 'ok' && !purchase && (
        <p role="status" className="mt-4 rounded-[14px] bg-soi-accent-soft p-3 text-sm text-soi-accent">Estamos confirmando tu pago. Recarga en unos segundos.</p>
      )}
      <div className="mt-5">
        <BlueprintDetail bp={bp} creator={creator} creatorHref={creator ? `/c/${creator.handle}` : undefined}>
          {own ? (
            <div className="flex flex-col gap-3">
              <BlueprintOwnerControls id={bp.id} status={bp.status} />
              <ImplementPanel blueprintId={bp.id} requiredMinutes={bp.required_minutes} defaultMinutes={bp.required_minutes}
                premium={null} existingImplementationId={(impl?.id as string) ?? null} locked={false} />
            </div>
          ) : (
            <ImplementPanel
              blueprintId={bp.id}
              requiredMinutes={bp.required_minutes}
              defaultMinutes={Math.min(profile?.available_minutes ?? bp.required_minutes, 240)}
              premium={bp.tier === 'premium' ? { priceCents: bp.price_cents, currency: bp.currency, purchased: Boolean(purchase) } : null}
              existingImplementationId={(impl?.id as string) ?? null}
              locked={bp.tier === 'free' && !access.routine_execution}
            />
          )}
        </BlueprintDetail>
      </div>
    </div>
  );
}
