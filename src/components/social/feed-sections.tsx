import Link from 'next/link';
import { IdeaCard } from '@/components/social/idea-card';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import { IDEA_FIELDS, myInteractions } from '@/lib/social/queries';
import { MOMENT_FIELDS, toMomentFlow } from '@/lib/moments/types';
import type { getSessionUser } from '@/lib/supabase/server';
import type { BlueprintImplementation, SoiMoment } from '@/types/database';

/** Secciones de servidor compartidas (Mi Vida). */
type Sb = Awaited<ReturnType<typeof getSessionUser>>['supabase'];

/** Biblioteca: tus Moments (propios, versiones tuyas y comprados) y tus ideas. */
export async function Biblioteca({ supabase, userId }: { supabase: Sb; userId: string }) {
  const [{ data: mine }, { data: purchases }, { data: impls }, { data: saved }, { data: ideas }] = await Promise.all([
    supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', userId).neq('status', 'archived')
      .order('updated_at', { ascending: false }).limit(30),
    supabase.from('blueprint_purchases').select('blueprint_id').eq('user_id', userId).limit(30),
    supabase.from('blueprint_implementations').select('id, adapted_steps, completed_steps, status, blueprint:soi_blueprints(title)')
      .eq('user_id', userId).order('last_activity_at', { ascending: false }).limit(10),
    supabase.from('moment_interactions').select('moment_id').eq('user_id', userId).eq('kind', 'save').order('created_at', { ascending: false }).limit(30),
    supabase.from('soi_moments').select(IDEA_FIELDS).eq('creator_id', userId).order('created_at', { ascending: false }).limit(30),
  ]);
  const boughtIds = (purchases ?? []).map((p) => p.blueprint_id as string);
  const savedIds = (saved ?? []).map((s) => s.moment_id as string);
  const [{ data: bought }, { data: savedIdeas }, interactions] = await Promise.all([
    boughtIds.length ? supabase.from('soi_blueprints').select(MOMENT_FIELDS).in('id', boughtIds) : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    savedIds.length ? supabase.from('soi_moments').select(IDEA_FIELDS).in('id', savedIds) : Promise.resolve({ data: [] as SoiMoment[] }),
    myInteractions(supabase, userId, savedIds),
  ]);
  const legacy = (impls ?? []) as unknown as (Pick<BlueprintImplementation, 'id' | 'adapted_steps' | 'completed_steps' | 'status'> & { blueprint: { title: string } | null })[];

  return (
    <div className="flex flex-col gap-8">
      <Section title="Mis Moments" empty={<>Crea uno en el <Link href="/m/nuevo" className="text-soi-accent underline underline-offset-4">constructor</Link>, pídeselo a SOI o guarda tu versión de uno de Impulso.</>}>
        {(mine ?? []).map(toMomentFlow).map((m) => <li key={m.id}><MomentFlowCard m={m} /></li>)}
      </Section>
      {(bought ?? []).length > 0 && (
        <Section title="Comprados" empty="">
          {(bought ?? []).map(toMomentFlow).map((m) => <li key={m.id}><MomentFlowCard m={m} /></li>)}
        </Section>
      )}
      {legacy.length > 0 && (
        <Section title="Sistemas en práctica" empty="">
          {legacy.map((i) => (
            <li key={i.id}>
              <Link href={`/implementaciones/${i.id}`} className="press flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-ring hover:shadow-soft">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.blueprint?.title ?? 'Moment'}</span>
                  <span className="nums block text-xs text-soi-muted">{i.status === 'completed' ? 'Completado' : `${i.completed_steps.length} de ${i.adapted_steps.length} pasos`}</span>
                </span>
              </Link>
            </li>
          ))}
        </Section>
      )}
      <Section title="Mis ideas" empty="Las ideas que guardas después de un video, un libro o una conversación con SOI.">
        {((ideas ?? []) as SoiMoment[]).map((m) => <li key={m.id}><IdeaCard m={m} showActions={false} /></li>)}
      </Section>
      {savedIds.length > 0 && (
        <Section title="Ideas guardadas de otros" empty="">
          {((savedIdeas ?? []) as SoiMoment[]).map((m) => <li key={m.id}><IdeaCard m={m} mine={{ resonance: interactions.has(`${m.id}:resonance`), save: true }} /></li>)}
        </Section>
      )}
    </div>
  );
}

export function Section({ title, empty, children }: { title: string; empty: React.ReactNode; children: React.ReactNode[] }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-medium text-soi-muted">{title}</h2>
      {children.length ? <ul className="flex flex-col gap-2">{children}</ul> : <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">{empty}</p>}
    </section>
  );
}

export function Empty({ text }: { text: string }) {
  return <p className="rounded-[20px] bg-soi-sidebar p-6 text-center text-soi-muted">{text}</p>;
}
