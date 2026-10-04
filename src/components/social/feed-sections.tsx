import { IdeaCard } from '@/components/social/idea-card';
import { IDEA_FIELDS, myInteractions } from '@/lib/social/queries';
import type { getSessionUser } from '@/lib/supabase/server';
import type { SoiMoment } from '@/types/database';

/** Secciones de servidor compartidas (Mi Vida). */
type Sb = Awaited<ReturnType<typeof getSessionUser>>['supabase'];

/** Ideas: las propias y las guardadas de otros (pestaña Ideas de Mi Vida). */
export async function IdeasSection({ supabase, userId }: { supabase: Sb; userId: string }) {
  const [{ data: saved }, { data: ideas }] = await Promise.all([
    supabase.from('moment_interactions').select('moment_id').eq('user_id', userId).eq('kind', 'save').order('created_at', { ascending: false }).limit(30),
    supabase.from('soi_moments').select(IDEA_FIELDS).eq('creator_id', userId).order('created_at', { ascending: false }).limit(30),
  ]);
  const savedIds = (saved ?? []).map((s) => s.moment_id as string);
  const [{ data: savedIdeas }, interactions] = await Promise.all([
    savedIds.length ? supabase.from('soi_moments').select(IDEA_FIELDS).in('id', savedIds) : Promise.resolve({ data: [] as SoiMoment[] }),
    myInteractions(supabase, userId, savedIds),
  ]);
  return (
    <div className="flex flex-col gap-8">
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
