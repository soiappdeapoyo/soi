import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Clock } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess } from '@/lib/billing/check-access';
import { ESLABON_LABEL } from '@/config/agents';
import { SOURCE_TYPES, TRIGGER_STATES, type TriggerState } from '@/config/creators';
import { MOMENT_FIELDS, myInteractions } from '@/lib/social/queries';
import { MomentActions } from '@/components/social/moment-actions';
import { MomentOwnerControls } from '@/components/social/moment-owner-controls';
import type { SoiMoment } from '@/types/database';

export const metadata: Metadata = { title: 'Momento' };

export default async function MomentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { data } = await supabase.from('soi_moments').select(MOMENT_FIELDS).eq('id', id).maybeSingle();
  if (!data) notFound();
  const m = data as SoiMoment;
  const mine = m.creator_id === user.id;

  const [share, interactions, { data: creator }] = await Promise.all([
    canAccess(user.id, 'community'),
    myInteractions(supabase, user.id, [m.id]),
    supabase.from('creator_profiles').select('user_id').eq('user_id', user.id).maybeSingle(),
  ]);

  const chain = [
    { label: 'Inspiración', body: m.source_reference ? `${SOURCE_TYPES[m.source_type]} · ${m.source_reference}` : SOURCE_TYPES[m.source_type] },
    { label: 'Insight', body: m.insight },
    { label: m.reflection_question ?? 'Reflexión', body: m.user_reflection },
  ].filter((c) => c.body);

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Link href="/impulso" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Impulso</Link>

      <p className="mt-5 text-xs text-soi-muted">
        {m.author_name ?? 'Alguien de SOI'} · {ESLABON_LABEL[m.category]}
        {m.visibility === 'private' && ' · Privado'}
      </p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{m.title}</h1>
      {m.trigger_state.length > 0 && (
        <p className="mt-2 flex flex-wrap gap-1.5">
          {m.trigger_state.map((s) => <span key={s} className="rounded-md bg-soi-sidebar px-2 py-0.5 text-xs text-soi-muted shadow-ring">{TRIGGER_STATES[s as TriggerState] ?? s}</span>)}
        </p>
      )}

      <ol className="mt-6 flex flex-col gap-3">
        {chain.map((c) => (
          <li key={c.label} className="rounded-[20px] bg-white p-4 shadow-ring">
            <p className="text-xs font-medium text-soi-muted">{c.label}</p>
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{c.body}</p>
          </li>
        ))}
        {m.actions.length > 0 && (
          <li className="rounded-[20px] bg-soi-sidebar p-3">
            <p className="px-1 pb-2 text-xs font-medium text-soi-muted">Acción</p>
            <ul className="flex flex-col gap-1.5">
              {m.actions.map((a, i) => (
                <li key={i} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2.5 shadow-ring">
                  <span className="flex-1 text-[15px]">{a.title}</span>
                  <span className="nums inline-flex items-center gap-1 text-xs text-soi-muted"><Clock className="h-3.5 w-3.5" aria-hidden="true" />{a.minutes} min</span>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ol>

      <div className="mt-5">
        {mine
          ? <MomentOwnerControls id={m.id} visibility={m.visibility} canShare={share.allowed} isCreator={Boolean(creator)} blueprintId={m.blueprint_id} />
          : <>
              {share.allowed && <MomentActions id={m.id} resonance={m.resonance_count} saves={m.save_count}
                initial={{ resonance: interactions.has(`${m.id}:resonance`), save: interactions.has(`${m.id}:save`) }} />}
              {m.blueprint_id && <Link href={`/blueprints/${m.blueprint_id}`} className="mt-3 inline-block text-sm text-soi-accent underline underline-offset-4">Este momento tiene un Blueprint para implementar</Link>}
            </>}
      </div>
    </div>
  );
}
