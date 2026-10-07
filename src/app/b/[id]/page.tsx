import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getSessionUser } from '@/lib/supabase/server';
import { PublicShell } from '@/components/public/public-shell';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { creatorsById } from '@/lib/social/queries';
import { MOMENT_FIELDS, toMomentFlow } from '@/lib/moments/types';
import { ACTIONS, MOMENT_KINDS } from '@/config/actions';
import { formatPrice } from '@/config/creators';
import { getSettings } from '@/lib/settings';

async function load(id: string) {
  const { supabase, user } = await getSessionUser();
  const { data } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('id', id).eq('status', 'published').maybeSingle();
  return { supabase, user, m: data ? toMomentFlow(data) : null };
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { m } = await load((await params).id);
  return m ? { title: m.title, description: m.objective } : { title: 'Moment' };
}

/**
 * Página pública de un SOI Moment: el creador la comparte en sus redes.
 * Muestra la forma del flujo (títulos, tipos y minutos); se ejecuta dentro de SOI.
 */
export default async function MomentPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, m } = await load(id);
  if (!m) notFound();
  if (user) redirect(`/m/${id}`);
  const creator = m.creator_id ? (await creatorsById(supabase, [m.creator_id])).get(m.creator_id) : undefined;

  return (
    <PublicShell signedIn={false}>
      <p className="flex flex-wrap items-center gap-2 text-xs text-soi-muted">
        <span className="rounded-md bg-soi-accent-soft px-1.5 py-0.5 font-medium text-soi-accent">SOI Moment · {MOMENT_KINDS[m.kind].label}</span>
        <span className="nums">{m.required_minutes} min · {m.blocks.length} acciones</span>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{m.title}</h1>
      {creator && <p className="mt-2 text-sm text-soi-muted">por <Link href={`/c/${creator.handle}`} className="font-medium text-soi-ink underline-offset-4 hover:underline">{creator.display_name}</Link></p>}
      <p className="mt-4 text-[17px] leading-relaxed">{m.objective}</p>
      <ol className="mt-5 flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
        {m.blocks.map((b, i) => (
          <li key={`${b.id}-${i}`} className="flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-ring">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soi-accent-soft text-soi-accent"><Icon name={ACTIONS[b.type]?.icon ?? 'Sparkles'} className="h-4 w-4" /></span>
            <span className="flex-1 text-[15px]">{b.title}</span>
            <span className="nums text-xs text-soi-muted">{b.minutes} min</span>
          </li>
        ))}
      </ol>
      <p className="nums mt-3 text-sm text-soi-muted">
        {m.executions_count.toLocaleString('es')} ejecuciones · Fuente: {m.source}{m.tier === 'premium' ? ` · ${formatPrice(m.price_cents, m.currency)}` : ''}
      </p>
      <div className="mt-6 rounded-[20px] bg-soi-sidebar p-3">
        <div className="rounded-lg bg-white p-4 shadow-ring">
          <p className="text-[15px]">SOI te guía paso a paso, aprende de cómo te fue y te propone una mejor versión para tu vida.</p>
          <Link href={`/login?next=/m/${m.id}`} className={buttonClass('primary', 'md', 'mt-3 w-full')}>Vivir este Moment en SOI</Link>
          <p className="mt-2 text-center text-xs text-soi-muted">{(await getSettings()).trialDays} días de prueba sin tarjeta.</p>
        </div>
      </div>
    </PublicShell>
  );
}
