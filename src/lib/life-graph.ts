import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { ROUTINES, isRoutineId } from '@/config/routines';
import { officialMoment } from '@/config/official-moments';

export type LifeNode = { id: string; title: string; detail?: string; href?: string; links: { label: string; href: string }[] };
export type LifeGroup = { id: string; label: string; empty: string; nodes: LifeNode[] };

const MONEY = /dinero|money|finanz|riqueza|ahorr|ingreso|deuda|gasto|inversi/i;

/**
 * Grafo personal: metas, riqueza, hábitos, rutinas, creencias, libros y videos, proyectos y progreso.
 * Las conexiones salen de la memoria transversal (metadata.moment_id / blueprint_id) — sin tablas nuevas.
 */
export async function loadLifeGraph(supabase: SupabaseClient, userId: string, profile: UserProfile | null): Promise<LifeGroup[]> {
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: actions }, { data: insights }, { data: impls }, { data: routines }, { data: sources }, { data: videos }, { data: evidence }, { data: wealth }, { data: runs }, { data: ownMoments }] = await Promise.all([
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
    supabase.from('moment_runs').select('moment_id, moment_slug').eq('user_id', userId).not('completed_at', 'is', null)
      .gte('completed_at', `${since30}T00:00:00Z`).limit(500),
    supabase.from('soi_blueprints').select('id, title, kind, parent_id, parent_slug').eq('creator_id', userId).neq('status', 'archived')
      .order('updated_at', { ascending: false }).limit(20),
  ]);

  // Ejecuciones de Moments del último mes, por Moment (oficial o de la tabla).
  const runCounts = new Map<string, number>();
  for (const r of runs ?? []) {
    const key = (r.moment_id as string | null) ?? `slug:${r.moment_slug}`;
    runCounts.set(key, (runCounts.get(key) ?? 0) + 1);
  }
  const runIds = [...runCounts.keys()].filter((k) => !k.startsWith('slug:'));
  const { data: runMoments } = runIds.length
    ? await supabase.from('soi_blueprints').select('id, title').in('id', runIds)
    : { data: [] as { id: string; title: string }[] };
  const titleOf = (key: string) => key.startsWith('slug:')
    ? officialMoment(key.slice(5))?.title ?? 'Moment'
    : ((runMoments ?? []).find((m) => m.id === key)?.title as string | undefined) ?? 'Moment';
  const hrefOf = (key: string) => `/m/${key.startsWith('slug:') ? key.slice(5) : key}`;

  const actionRows = (actions ?? []) as { id: string; title: string; status: string; metadata: { area?: string | null; minutes?: number } | null }[];
  const momentLink = (m: { moment_id?: string } | null) => (m?.moment_id ? [{ label: 'Idea', href: `/ideas/${m.moment_id}` }] : []);

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
      id: 'habitos', label: 'Hábitos y sistemas', empty: 'Vive un Moment varias veces y se volverá hábito.',
      nodes: [
        // Un Moment ejecutado 3+ veces en el mes ya es un hábito; los propios son tu sistema personal.
        ...((ownMoments ?? []) as { id: string; title: string; parent_id: string | null; parent_slug: string | null }[]).map((m) => {
          const n = runCounts.get(m.id) ?? 0;
          return {
            id: m.id, title: m.title, href: `/m/${m.id}`,
            detail: n >= 3 ? `Hábito · ${n} veces este mes` : n ? `${n} ${n === 1 ? 'vez' : 'veces'} este mes` : 'Aún sin ejecutar',
            links: m.parent_id ? [{ label: 'el original', href: `/m/${m.parent_id}` }] : m.parent_slug ? [{ label: 'el original', href: `/m/${m.parent_slug}` }] : [],
          };
        }),
        ...((impls ?? []) as unknown as { id: string; status: string; completed_steps: number[]; adapted_steps: unknown[]; blueprint_id: string; blueprint: { title: string; source: string } | null }[])
          .map((i) => ({
            id: i.id, title: i.blueprint?.title ?? 'Moment', href: `/implementaciones/${i.id}`,
            detail: i.status === 'completed' ? 'Completado' : `${i.completed_steps.length} de ${i.adapted_steps.length} pasos`,
            links: [{ label: 'Moment', href: `/m/${i.blueprint_id}` }],
          })),
      ],
    },
    {
      id: 'rutinas', label: 'Moments vividos este mes', empty: 'Cuando completes un Moment aparecerá aquí.',
      nodes: [
        ...[...runCounts.entries()].sort((a, b) => b[1] - a[1]).map(([key, n]) => ({
          id: `run-${key}`, title: titleOf(key), detail: `${n} ${n === 1 ? 'vez' : 'veces'} este mes`, href: hrefOf(key), links: [],
        })),
        ...[...routineCounts.entries()].filter(([id]) => isRoutineId(id)).map(([id, n]) => {
          const r = ROUTINES[id as keyof typeof ROUTINES];
          return { id, title: r.label, detail: `${n} ${n === 1 ? 'vez' : 'veces'} este mes · ${r.author}`, href: `/m/${id}`, links: [] };
        }),
      ],
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
            href: `/ideas/${s.id}`, links: s.blueprint_id ? [{ label: 'Moment', href: `/m/${s.blueprint_id}` }] : [],
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
