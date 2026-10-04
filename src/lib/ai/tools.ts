import { tool } from 'ai';
import { z } from 'zod/v3';
import type { SupabaseClient } from '@supabase/supabase-js';
import { searchYouTube } from '@/lib/integrations/youtube';
import { webSearch } from '@/lib/integrations/web-search';
import { remember } from './rag';
import { ROUTINES, ROUTINE_IDS } from '@/config/routines';
import { recordMomentum } from '@/lib/momentum-server';
import { ActionCardSchema, EslabonSchema } from '@/lib/action-card';

type Ctx = {
  supabase: SupabaseClient;
  userId: string;
  authorName?: string | null;
  access: { youtube: boolean; evidence: boolean; routines?: boolean; ritual?: boolean };
};

export function buildTools({ supabase, userId, authorName, access }: Ctx) {
  return {
    youtubeSearch: tool({
      description: 'Busca videos de YouTube en español (meditaciones guiadas, charlas de los autores de SOI).',
      inputSchema: z.object({ query: z.string().min(3).max(120) }),
      execute: async ({ query }) => {
        if (!access.youtube) return { locked: true as const, videos: [] };
        const videos = await searchYouTube(query);
        if (videos.length) {
          await remember(supabase, {
            user_id: userId, category: 'video_cache', title: query,
            content: videos.map((v) => `${v.title} — ${v.channel}`).join('\n'),
            metadata: { videos }, withEmbedding: false,
          });
        }
        return { locked: false as const, videos };
      },
    }),

    saveEvidence: tool({
      description: 'Guarda una evidencia (logro, señal, resultado) en el Muro de Evidencias del usuario.',
      inputSchema: z.object({
        title: z.string().min(3).max(120),
        content: z.string().min(3).max(2000),
        eslabon: z.enum(['pensamiento', 'emocion', 'accion', 'resultado']).default('resultado'),
        tags: z.array(z.string().max(30)).max(5).default([]),
      }),
      execute: async ({ title, content, eslabon, tags }) => {
        if (!access.evidence) return { locked: true as const };
        const id = await remember(supabase, {
          user_id: userId, category: 'evidencia', title, content, tags,
          metadata: { eslabon_soi: eslabon, source: 'chat' }, status: 'completado',
        });
        if (id) await recordMomentum(supabase, userId, 'evidence_saved', { eslabon });
        return { locked: false as const, id };
      },
    }),

    updateProfile: tool({
      description: 'Actualiza el perfil psicológico del usuario cuando revele metas, bloqueos, emoción dominante o arquetipo.',
      inputSchema: z.object({
        goals: z.array(z.string().max(120)).max(10).optional(),
        blockers: z.array(z.string().max(120)).max(10).optional(),
        dominant_emotion: z.string().max(40).optional(),
        archetype: z.string().max(60).optional(),
        weakest_link: z.enum(['pensamiento', 'emocion', 'accion', 'resultado']).optional(),
        available_minutes: z.number().int().min(1).max(180).optional(),
        onboarding_completed: z.boolean().optional().describe('true cuando ya conoces una meta o emoción y su eslabón más débil'),
      }),
      execute: async (patch) => {
        const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
        if (!Object.keys(clean).length) return { ok: true };
        const { error } = await supabase.from('user_profiles').update(clean).eq('user_id', userId);
        if (!error && patch.goals?.length) await recordMomentum(supabase, userId, 'goal_set', { eslabon: 'resultado' });
        return { ok: !error };
      },
    }),

    scheduleReminder: tool({
      description: 'Programa un recordatorio para una micro-acción o rutina.',
      inputSchema: z.object({
        text: z.string().min(3).max(200),
        when: z.string().describe('Fecha/hora ISO 8601 en la zona del usuario'),
        routineId: z.string().optional(),
      }),
      execute: async ({ text, when, routineId }) => {
        const id = await remember(supabase, {
          user_id: userId, category: 'accion', title: 'Recordatorio', content: text,
          tags: ['recordatorio'], status: 'en_progreso',
          metadata: { eslabon_soi: 'accion', remind_at: when, routine_id: routineId ?? null },
          withEmbedding: false,
        });
        return { ok: Boolean(id), when };
      },
    }),

    suggestPractice: tool({
      description: 'Ofrece a la persona un botón para empezar ahora una práctica de SOI (rutina guiada, ritual diario o registrar una evidencia).',
      inputSchema: z.object({
        kind: z.enum(['routine', 'ritual', 'evidence']),
        routineId: z.enum(ROUTINE_IDS).optional().describe('Obligatorio si kind = routine'),
        reason: z.string().max(140).describe('Por qué ayuda ahora, en una frase cálida'),
      }),
      execute: async ({ kind, routineId, reason }) => {
        if (kind === 'routine') {
          const r = ROUTINES[routineId ?? 'brian_tracy_5min'];
          return { kind, href: `/rutinas/${r.id}`, label: r.label, detail: `${r.author} · ${r.totalMinutes} min`, reason, locked: access.routines === false };
        }
        if (kind === 'ritual') {
          return { kind, href: '/ritual', label: 'Ritual de hoy', detail: 'Afirmación · visualización · acción · señal', reason, locked: access.ritual === false };
        }
        return { kind, href: '/evidencias/nueva', label: 'Guardar una evidencia', detail: 'Muro de Evidencias', reason, locked: !access.evidence };
      },
    }),

    createActionCard: tool({
      description: 'Convierte un insight o una prioridad en una Action Card concreta que la persona puede marcar como hecha.',
      inputSchema: ActionCardSchema.extend({
        category: z.string().max(40).optional().describe('Área de vida, p. ej. "Money OS", "Salud", "Relaciones"'),
      }),
      execute: async ({ title, minutes, detail, eslabon, category }) => {
        const id = await remember(supabase, {
          user_id: userId, category: 'accion', title, content: detail ?? title,
          tags: ['action_card'], status: 'en_progreso',
          metadata: { eslabon_soi: eslabon ?? 'accion', minutes, area: category ?? null, source: 'chat' },
          withEmbedding: false,
        });
        return { id: id ?? null, title, minutes, detail: detail ?? null, category: category ?? null, done: false };
      },
    }),

    captureMoment: tool({
      description: 'Guarda un SOI Moment privado cuando la persona transforma una idea, emoción o aprendizaje en acción (inspiración → insight → reflexión → acción).',
      inputSchema: z.object({
        title: z.string().min(3).max(120),
        insight: z.string().min(3).max(1000).describe('La idea central, en palabras de la persona'),
        reflectionQuestion: z.string().max(300).optional(),
        userReflection: z.string().max(2000).optional(),
        category: EslabonSchema.default('accion'),
        sourceType: z.enum(['video', 'book', 'podcast', 'personal_experience', 'ai_generated']).default('ai_generated'),
        sourceReference: z.string().max(200).optional().describe('Autor y obra si viene de un libro o video'),
        actions: z.array(ActionCardSchema).max(5).default([]),
      }),
      execute: async (m) => {
        const { data, error } = await supabase.from('soi_moments').insert({
          creator_id: userId, author_name: authorName ?? null, title: m.title, insight: m.insight,
          reflection_question: m.reflectionQuestion ?? null, user_reflection: m.userReflection ?? null,
          category: m.category, source_type: m.sourceType, source_reference: m.sourceReference ?? null,
          actions: m.actions, visibility: 'private',
        }).select('id').single();
        if (error) return { ok: false as const };
        // Grafo de conocimiento: el insight queda en la memoria transversal enlazado al Moment.
        await remember(supabase, {
          user_id: userId, category: 'pensamiento', title: m.title, content: m.insight,
          tags: ['insight', 'moment'], metadata: { eslabon_soi: m.category, moment_id: data.id },
        });
        await recordMomentum(supabase, userId, 'reflection', { eslabon: m.category, metadata: { moment_id: data.id } });
        return { ok: true as const, id: data.id as string, title: m.title };
      },
    }),

    webSearch: tool({
      description: 'Busca información verificable en la web. No usar para inventar técnicas.',
      inputSchema: z.object({ query: z.string().min(3).max(200) }),
      execute: async ({ query }) => {
        const results = await webSearch(query);
        if (results.length) {
          await remember(supabase, {
            user_id: userId, category: 'aprendizaje_web', title: query,
            content: results.map((r) => `${r.title}: ${r.content}`).join('\n'),
            metadata: { urls: results.map((r) => r.url) }, withEmbedding: false,
          });
        }
        return { results };
      },
    }),
  };
}
