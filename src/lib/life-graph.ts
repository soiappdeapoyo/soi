import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { officialMoment } from '@/config/official-moments';
import { loadHillMemory } from '@/lib/ai/hill-memory';

export type LifeNode = { id: string; title: string; detail?: string; href?: string; links: { label: string; href: string }[] };
export type LifeGroup = { id: string; label: string; empty: string; nodes: LifeNode[] };

/**
 * "Mi sistema": metas, hábitos (Moments que repites), creencias y progreso. Lo que guardas
 * (Moments, libros, PDFs, ejercicios, ideas) vive en las otras pestañas de Mi Vida.
 */
export async function loadLifeGraph(supabase: SupabaseClient, userId: string, profile: UserProfile | null): Promise<LifeGroup[]> {
  const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const [{ data: insights }, { data: evidence }, { data: runs }, hill] = await Promise.all([
    supabase.from('agent_knowledge').select('id, title, content, metadata').eq('user_id', userId).eq('category', 'pensamiento')
      .contains('tags', ['insight']).order('created_at', { ascending: false }).limit(8),
    supabase.from('agent_knowledge').select('id, title, created_at').eq('user_id', userId).eq('category', 'evidencia')
      .order('created_at', { ascending: false }).limit(5),
    supabase.from('moment_runs').select('moment_id, moment_slug').eq('user_id', userId).not('completed_at', 'is', null)
      .gte('completed_at', `${since30}T00:00:00Z`).limit(500),
    loadHillMemory(supabase, userId),
  ]);

  // Un Moment vivido 3+ veces en el último mes ya es un hábito.
  const runCounts = new Map<string, number>();
  for (const r of runs ?? []) {
    const key = (r.moment_id as string | null) ?? `slug:${r.moment_slug}`;
    runCounts.set(key, (runCounts.get(key) ?? 0) + 1);
  }
  const habitKeys = [...runCounts.entries()].filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]);
  const ids = habitKeys.map(([k]) => k).filter((k) => !k.startsWith('slug:'));
  const { data: titled } = ids.length
    ? await supabase.from('soi_blueprints').select('id, title').in('id', ids)
    : { data: [] as { id: string; title: string }[] };
  const titleOf = (key: string) => key.startsWith('slug:')
    ? officialMoment(key.slice(5))?.title ?? 'Moment'
    : ((titled ?? []).find((m) => m.id === key)?.title as string | undefined) ?? 'Moment';

  const h = hill.memory;
  return [
    {
      // El propósito principal definido con Napoleon Hill (su memoria longitudinal).
      id: 'proposito', label: 'Propósito principal',
      empty: 'Define tu propósito principal con Napoleon Hill: qué quieres, para cuándo y qué darás a cambio.',
      nodes: h?.definite_chief_aim ? [
        { id: 'hill-aim', title: h.definite_chief_aim, detail: [h.target, h.deadline && `para ${h.deadline}`, h.stage && `etapa: ${h.stage}`].filter(Boolean).join(' · ') || undefined, href: '/chat?agent=napoleon_hill', links: [] },
        ...(h.plan ? [{ id: 'hill-plan', title: h.plan, detail: 'Plan organizado', links: [] }] : []),
        ...(h.obstacle ? [{ id: 'hill-obstacle', title: h.obstacle, detail: 'Lo que te detiene', links: [] }] : []),
        ...(h.mastermind?.length ? [{ id: 'hill-mm', title: h.mastermind.join(', '), detail: 'Tu mastermind', links: [] }] : []),
      ] : [],
    },
    {
      id: 'metas', label: 'Metas', empty: 'Cuéntale a SOI qué quieres lograr y aparecerán aquí.',
      nodes: (profile?.goals ?? []).map((g, i) => ({ id: `goal-${i}`, title: g, links: [] })),
    },
    {
      id: 'habitos', label: 'Hábitos', empty: 'Un Moment que vives 3 veces en un mes se vuelve hábito.',
      nodes: habitKeys.map(([key, n]) => ({
        id: `habit-${key}`, title: titleOf(key), detail: `${n} veces este mes`,
        href: `/m/${key.startsWith('slug:') ? key.slice(5) : key}`, links: [],
      })),
    },
    {
      id: 'creencias', label: 'Creencias', empty: 'Las ideas que guardas y los bloqueos que reconoces viven aquí.',
      nodes: [
        ...((insights ?? []) as { id: string; title: string; content: string; metadata: { moment_id?: string } | null }[])
          .map((n) => ({
            id: n.id, title: n.content.slice(0, 140), detail: n.title,
            links: n.metadata?.moment_id ? [{ label: 'Idea', href: `/ideas/${n.metadata.moment_id}` }] : [],
          })),
        ...(profile?.blockers ?? []).map((b, i) => ({ id: `block-${i}`, title: b, detail: 'Bloqueo por transformar', links: [] })),
      ],
    },
    {
      id: 'progreso', label: 'Progreso', empty: 'Cada evidencia que registras es prueba de tu nueva identidad.',
      nodes: ((evidence ?? []) as { id: string; title: string }[]).map((e) => ({ id: e.id, title: e.title, href: '/evidencias', links: [] })),
    },
  ];
}
