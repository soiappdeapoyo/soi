import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { buttonClass } from '@/components/ui/button';
import { ImplementationSteps } from '@/components/social/implementation-steps';
import type { BlueprintImplementation } from '@/types/database';

export const metadata: Metadata = { title: 'Mi versión' };

export default async function ImplementacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { data } = await supabase.from('blueprint_implementations')
    .select('*, blueprint:soi_blueprints(id, title, source, required_minutes)').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (!data) notFound();
  const impl = data as BlueprintImplementation & { blueprint: { id: string; title: string; source: string; required_minutes: number } | null };

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/mi-vida#biblioteca" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mi Vida</Link>
      <p className="mt-5 text-xs text-soi-muted">Tu versión · {impl.adapted_minutes ?? impl.blueprint?.required_minutes} min al día</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{impl.blueprint?.title ?? 'Blueprint'}</h1>
      {impl.adaptation_note && <p className="mt-3 rounded-[14px] bg-soi-accent-soft p-3 text-[15px] text-soi-accent">{impl.adaptation_note}</p>}

      <div className="mt-6">
        <ImplementationSteps id={impl.id} steps={impl.adapted_steps} initialDone={impl.completed_steps}
          initialCompleted={impl.status === 'completed'} initialNote={impl.result_note} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link href="/chat" className={buttonClass('outline', 'sm')}><MessageCircle className="h-4 w-4" aria-hidden="true" /> Hablarlo con SOI</Link>
        {impl.blueprint && <Link href={`/blueprints/${impl.blueprint.id}`} className="text-sm text-soi-muted underline-offset-4 hover:underline">Ver el original</Link>}
      </div>
      {impl.blueprint?.source && <p className="mt-4 text-xs text-soi-muted">Fuente: {impl.blueprint.source}</p>}
    </div>
  );
}
