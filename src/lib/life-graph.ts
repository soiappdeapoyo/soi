import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { ROUTINES, isRoutineId } from '@/config/routines';

export type LifeNode = { id: string; title: string; detail?: string; href?: string; links: { label: string; href: string }[] };
export type LifeGroup = { id: string; label: string; empty: string; nodes: LifeNode[] };

const MONEY = /dinero|money|finanz|riqueza|ahorr|ingreso|deuda|gasto|inversi/i;

/**
 * Grafo personal: metas, riqueza, hábitos, rutinas, creencias, libros y videos, proyectos y progreso.
 * Las conexiones salen de la memoria transversal (metadata.moment_id / blueprint_id) — sin tablas nuevas.
 */
export async function loadLifeGraph(supabase: SupabaseClient, userId: string, profile: UserProfile | null): Promise<LifeGroup[]> {
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: actions }, { data: insights }, { data: impls }, { data: routines }, { data: sources }, { data: videos }, { data: evidence }, { data: wealth }] = await Promise.all([
    supabase.from('agent_knowledge').select('id, title, status, metadata, created_at').eq('user_id', userId).eq('category', 'accion')
      .contains('tags', ['action_card']).order('created_at', { ascending: false }).limit(50),
    supabase.from('agent_knowledge').select('id, title, content, metadata').eq('user_id', userId).eq('category', 'pensamiento')
      .contains('tags', ['insight']).order('created_at', { ascending: false }).limit(8),
    supabase.from('blueprint_implementations').select('id, status, completed_steps, adapted_steps, blueprint_id, blueprint:soi_blueprints(title, source)')
      .eq('user_id', userId).order('last_activity_at', { ascending: false }).limit(10),
    supabase.from('daily_routines').select('routine_type, routine_date').eq('user_id', userId).gte('routine_date', since30),
    supabase.from('soi_moments').select('id, title, source_type, source_reference, blueprint_id').eq('creator_id', userId)
      .in('source_type', ['book', 'video', 'podcast']).order('created_at', { ascending: false }).limit(12),
    supabase.from('momentum_events').select('metadata, created_at').eq('user_id', userId).eq('kind', 'video_watched')
      .order('created_at', { ascending: false }).limit(8),
    supabase.from('agent_knowledge').select('id, title, created_at').eq('user_id', userId).eq('category', 'evidencia')
      .order('created_at', { ascending: false }).limit(4),
    supabase.from('agent_knowledge').select('id, title, content').eq('user_id', userId).eq('category', 'riqueza')
      .order('created_at', { ascending: false }).limit(4),
  ]);

  const actionRows = (actions ?? []) as { id: string; title: string; status: string; metadata: { area?: string | null; minutes?: number } | null }[];
  const momentLink = (m: { moment_id?: string } | null) => (m?.moment_id ? [{ label: 'Momento', href: `/momentos/${m.moment_id}` }] : []);

  const routineCounts = new Map<string, number>();
  for (const r of routines ?? []) routineCounts.set(r.routine_type as string, (routineCounts.get(r.routine_type as string) ?? 0) + 1);

  const watched = new Map<string, { title: string; channel?: string }>();
  for (const v of videos ?? []) {
    const m = v.metadata as { video_id?: string; title?: string; channel?: string } | null;
    if (m?.video_id && !watched.has(m.video_id)) watched.set(m.video_id, { title: m.title ?? 'Video', channel: m.channel });
  }

  return [
    {
      id: 'metas', label: 'Metas', empty: 'Cuéntale a SOI qué quieres lograr y aparecerán aquí.',
      nodes: (profile?.goals ?? []).map((g, i) => ({ id: `goal-${i}`, title: g, links: [] })),
    },
    {
      id: 'riqueza', label: 'Riqueza', empty: 'Tus metas y acciones de dinero se conectan aquí.',
      nodes: [
        ...actionRows.filter((a) => MONEY.test(`${a.metadata?.area ?? ''} ${a.title}`)).slice(0, 4)
          .map((a) => ({ id: a.id, title: a.title, detail: a.status === 'completado' ? 'Hecho' : 'En progreso', links: [] })),
        ...((wealth ?? []) as { id: string; title: string }[]).map((w) => ({ id: w.id, title: w.title, links: [] })),
      ],
    },
    {
      id: 'habitos', label: 'Hábitos y sistemas', empty: 'Implementa un Blueprint desde Impulso para construir un hábito.',
      nodes: ((impls ?? []) as unknown as { id: string; status: string; completed_steps: number[]; adapted_steps: unknown[]; blueprint_id: string; blueprint: { title: string; source: string } | null }[])
        .map((i) => ({
          id: i.id, title: i.blueprint?.title ?? 'Blueprint', href: `/implementaciones/${i.id}`,
          detail: i.status === 'completed' ? 'Completado' : `${i.completed_steps.length} de ${i.adapted_steps.length} pasos`,
          links: [{ label: 'Blueprint', href: `/blueprints/${i.blueprint_id}` }],
        })),
    },
    {
      id: 'rutinas', label: 'Rutinas', empty: 'Completa una rutina guiada y aparecerá aquí.',
      nodes: [...routineCounts.entries()].filter(([id]) => isRoutineId(id)).map(([id, n]) => {
        const r = ROUTINES[id as keyof typeof ROUTINES];
        return { id, title: r.label, detail: `${n} ${n === 1 ? 'vez' : 'veces'} este mes · ${r.author}`, href: `/rutinas/${id}`, links: [] };
      }),
    },
    {
      id: 'creencias', label: 'Creencias', empty: 'Las ideas que guardas y los bloqueos que reconoces viven aquí.',
      nodes: [
        ...((insights ?? []) as { id: string; title: string; content: string; metadata: { moment_id?: string } | null }[])
          .map((n) => ({ id: n.id, title: n.content.slice(0, 140), detail: n.title, links: momentLink(n.metadata) })),
        ...(profile?.blockers ?? []).map((b, i) => ({ id: `block-${i}`, title: b, detail: 'Bloqueo por transformar', links: [] })),
      ],
    },
    {
      id: 'fuentes', label: 'Libros y videos', empty: 'Los videos que terminas y los libros que te inspiran se conectan aquí.',
      nodes: [
        ...((sources ?? []) as { id: string; title: string; source_type: string; source_reference: string | null; blueprint_id: string | null }[])
          .map((s) => ({
            id: s.id, title: s.source_reference ?? s.title, detail: s.source_type === 'book' ? 'Libro' : s.source_type === 'video' ? 'Video' : 'Podcast',
            href: `/momentos/${s.id}`, links: s.blueprint_id ? [{ label: 'Blueprint', href: `/blueprints/${s.blueprint_id}` }] : [],
          })),
        ...[...watched.entries()].filter(([, v]) => !(sources ?? []).some((s) => (s.source_reference as string | null)?.startsWith(v.title)))
          .map(([id, v]) => ({ id: `video-${id}`, title: v.title, detail: v.channel ? `Video · ${v.channel}` : 'Video', links: [] })),
      ],
    },
    {
      id: 'proyectos', label: 'Proyectos en marcha', empty: 'Las Action Cards que SOI crea contigo aparecen aquí.',
      nodes: actionRows.filter((a) => a.status === 'en_progreso').slice(0, 6)
        .map((a) => ({ id: a.id, title: a.title, detail: `${a.metadata?.minutes ?? 5} min${a.metadata?.area ? ` · ${a.metadata.area}` : ''}`, links: [] })),
    },
    {
      id: 'progreso', label: 'Progreso', empty: 'Cada evidencia que registras es prueba de tu nueva identidad.',
      nodes: ((evidence ?? []) as { id: string; title: string }[]).map((e) => ({ id: e.id, title: e.title, href: '/evidencias', links: [] })),
    },
  ];
}
