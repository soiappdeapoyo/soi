import { tool } from 'ai';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { searchYouTube } from '@/lib/integrations/youtube';
import { webSearch } from '@/lib/integrations/web-search';
import { remember } from './rag';

type Ctx = {
  supabase: SupabaseClient;
  userId: string;
  access: { youtube: boolean; evidence: boolean };
};

export function buildTools({ supabase, userId, access }: Ctx) {
  return {
    youtubeSearch: tool({
      description: 'Busca videos de YouTube en español (meditaciones guiadas, charlas de los autores de SOI).',
      parameters: z.object({ query: z.string().min(3).max(120) }),
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
      parameters: z.object({
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
        return { locked: false as const, id };
      },
    }),

    updateProfile: tool({
      description: 'Actualiza el perfil psicológico del usuario cuando revele metas, bloqueos, emoción dominante o arquetipo.',
      parameters: z.object({
        goals: z.array(z.string().max(120)).max(10).optional(),
        blockers: z.array(z.string().max(120)).max(10).optional(),
        dominant_emotion: z.string().max(40).optional(),
        archetype: z.string().max(60).optional(),
        weakest_link: z.enum(['pensamiento', 'emocion', 'accion', 'resultado']).optional(),
      }),
      execute: async (patch) => {
        const clean = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
        if (!Object.keys(clean).length) return { ok: true };
        const { error } = await supabase.from('user_profiles').update(clean).eq('user_id', userId);
        return { ok: !error };
      },
    }),

    scheduleReminder: tool({
      description: 'Programa un recordatorio para una micro-acción o rutina.',
      parameters: z.object({
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

    webSearch: tool({
      description: 'Busca información verificable en la web. No usar para inventar técnicas.',
      parameters: z.object({ query: z.string().min(3).max(200) }),
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
