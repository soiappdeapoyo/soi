import Link from 'next/link';
import { MomentCard } from '@/components/social/moment-card';
import { BlueprintCard } from '@/components/social/blueprint-card';
import { BLUEPRINT_FIELDS, MOMENT_FIELDS, creatorsById, myInteractions } from '@/lib/social/queries';
import type { getSessionUser } from '@/lib/supabase/server';
import type { BlueprintImplementation, SoiBlueprint, SoiMoment } from '@/types/database';

/** Secciones de servidor compartidas por Impulso y Mi Vida. */
type Sb = Awaited<ReturnType<typeof getSessionUser>>['supabase'];

export async function Tendencias({ supabase }: { supabase: Sb }) {
  const { data: trending } = await supabase.rpc('trending_blueprints', { p_days: 7, p_limit: 10 });
  const rows = (trending ?? []) as { blueprint_id: string; recent_implementations: number }[];
  if (!rows.length) return <Empty text="Todavía no hay tendencias esta semana." />;
  const { data } = await supabase.from('soi_blueprints').select(BLUEPRINT_FIELDS).in('id', rows.map((r) => r.blueprint_id));
  const byId = new Map(((data ?? []) as SoiBlueprint[]).map((b) => [b.id, b]));
  const creators = await creatorsById(supabase, [...byId.values()].map((b) => b.creator_id));
  return (
    <>
      <p className="mb-3 text-sm text-soi-muted">No los más vistos: los protocolos que más personas están implementando esta semana.</p>
      <ol className="flex flex-col gap-3">
        {rows.map((r, i) => {
          const bp = byId.get(r.blueprint_id);
          return bp ? <li key={bp.id}><BlueprintCard bp={bp} creator={creators.get(bp.creator_id)} rank={i + 1} recent={Number(r.recent_implementations)} /></li> : null;
        })}
      </ol>
    </>
  );
}

export async function Biblioteca({ supabase, userId }: { supabase: Sb; userId: string }) {
  const [{ data: impls }, { data: saved }, { data: own }] = await Promise.all([
    supabase.from('blueprint_implementations').select('id, blueprint_id, adapted_steps, completed_steps, status, blueprint:soi_blueprints(title)')
      .eq('user_id', userId).order('last_activity_at', { ascending: false }).limit(30),
    supabase.from('moment_interactions').select('moment_id').eq('user_id', userId).eq('kind', 'save').order('created_at', { ascending: false }).limit(30),
    supabase.from('soi_moments').select(MOMENT_FIELDS).eq('creator_id', userId).order('created_at', { ascending: false }).limit(30),
  ]);
  const savedIds = (saved ?? []).map((s) => s.moment_id as string);
  const { data: savedMoments } = savedIds.length
    ? await supabase.from('soi_moments').select(MOMENT_FIELDS).in('id', savedIds)
    : { data: [] as SoiMoment[] };
  const mine = await myInteractions(supabase, userId, savedIds);

  const implementations = (impls ?? []) as unknown as (Pick<BlueprintImplementation, 'id' | 'adapted_steps' | 'completed_steps' | 'status'> & { blueprint: { title: string } | null })[];

  return (
    <div className="flex flex-col gap-8">
      <Section title="En práctica" empty="Cuando implementes un Blueprint, aparecerá aquí con tu versión adaptada.">
        {implementations.map((i) => {
          const pct = Math.round((i.completed_steps.length / Math.max(i.adapted_steps.length, 1)) * 100);
          return (
            <li key={i.id}>
              <Link href={`/implementaciones/${i.id}`} className="press flex items-center gap-3 rounded-[14px] bg-white p-3 shadow-ring hover:shadow-soft">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{i.blueprint?.title ?? 'Blueprint'}</span>
                  <span className="nums block text-xs text-soi-muted">{i.status === 'completed' ? 'Completado' : `${i.completed_steps.length} de ${i.adapted_steps.length} pasos`}</span>
                </span>
                <span className="nums text-sm text-soi-accent">{pct}%</span>
              </Link>
            </li>
          );
        })}
      </Section>
      <Section title="Mis momentos" empty="Tus insights convertidos en acción. SOI también los guarda desde el chat.">
        {((own ?? []) as SoiMoment[]).map((m) => <li key={m.id}><MomentCard m={m} showActions={false} /></li>)}
      </Section>
      <Section title="Guardados para implementar" empty="Guarda los momentos que quieras practicar.">
        {((savedMoments ?? []) as SoiMoment[]).map((m) => <li key={m.id}><MomentCard m={m} mine={{ resonance: mine.has(`${m.id}:resonance`), save: true }} /></li>)}
      </Section>
    </div>
  );
}

export function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
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
