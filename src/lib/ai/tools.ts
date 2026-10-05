import { tool } from 'ai';
import { z } from 'zod/v3';
import type { SupabaseClient } from '@supabase/supabase-js';
import { searchYouTube } from '@/lib/integrations/youtube';
import { webSearch } from '@/lib/integrations/web-search';
import { remember } from './rag';
import { ROUTINES, ROUTINE_IDS } from '@/config/routines';
import { recordMomentum } from '@/lib/momentum-server';
import { ActionCardSchema, EslabonSchema } from '@/lib/action-card';
import { ACTION_TYPES, MomentKindSchema, parseBlocks, type ActionType } from '@/config/actions';
import { ownsDocuments, resolveLibraryBlocks } from '@/lib/moments/library-blocks';
import { enrichGuidedBlocks } from '@/lib/moments/enrich';
import { generateGuided, personalContext, saveGuided } from './content-agents';
import type { UserProfile } from '@/types/database';

type Ctx = {
  supabase: SupabaseClient;
  userId: string;
  authorName?: string | null;
  access: { youtube: boolean; evidence: boolean; routines?: boolean; ritual?: boolean };
};

export function buildTools({ supabase, userId, authorName, access }: Ctx) {
  // Perfil para personalizar el contenido de los agentes (con el cliente de esta conversación; si falla, sin perfil).
  const profileOf = async (): Promise<UserProfile | null> => {
    try {
      const { data } = await supabase.from('user_profiles').select('*').eq('user_id', userId).maybeSingle();
      return (data as UserProfile | null) ?? null;
    } catch { return null; }
  };
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
          return { kind, href: `/m/${r.id}/play`, label: r.label, detail: `${r.author} · ${r.totalMinutes} min`, reason, locked: access.routines === false };
        }
        if (kind === 'ritual') {
          return { kind, href: '/ritual', label: 'Ritual de hoy', detail: 'Afirmación · visualización · acción · señal', reason, locked: access.ritual === false };
        }
        return { kind, href: '/evidencias/nueva', label: 'Guardar una evidencia', detail: 'Muro de Evidencias', reason, locked: !access.evidence };
      },
    }),

    createMoment: tool({
      description: 'Diseña un SOI Moment: un flujo corto de acciones (3 a 6) con intención, objetivo y resultado esperado, listo para comenzar. Úsalo en lugar de tareas sueltas.',
      inputSchema: z.object({
        title: z.string().min(3).max(80).describe('Nombre evocador, p. ej. "Reconectar"'),
        objective: z.string().min(3).max(300).describe('El cambio emocional, mental o conductual que busca'),
        kind: MomentKindSchema.describe('recovery para ansiedad, tristeza o falta de enfoque; growth para metas; learning si parte de un libro o video; daily si se repetirá; challenge para retos de varios días (usa day en cada bloque)'),
        reason: z.string().max(160).describe('Por qué este Moment ahora, en una frase cálida'),
        source: z.string().min(2).max(200).describe('Autores en los que se basa, p. ej. "Diseñado por SOI · basado en Brian Tracy y Joe Dispenza"'),
        blocks: z.array(z.object({
          type: z.enum(ACTION_TYPES.filter((t) => t !== 'moment') as [ActionType, ...ActionType[]]),
          title: z.string().min(2).max(80),
          minutes: z.number().int().min(1).max(30),
          config: z.record(z.unknown()).describe('breathing:{inhale,exhale} meditation:{guide} timer:{instruction} writing:{prompt} visualization:{scene} checklist:{items[]} video:{query} walk:{instruction} gratitude:{count} reading:{book,pages} reflection:{question} affirmation:{text,repeat} goal:{prompt} emotion_log:{question} rest:{instruction,variant} celebration:{message} next_step:{instruction} canvas:{prompt} mind_map:{center,branches} quiz:{questions:[{q,options[],answer,explain}]} music:{query} audio:{mode:"record",prompt} photo:{prompt} agenda:{prompt,defaultTime:"HH:MM"} pomodoro:{focus,rest,cycles} contract:{commitment,consequence} weekly_review:{} tracking:{metric,unit,target} stretching:{sequence[],secondsEach} book:{title,author,mode:"summary"|"read",pages} document:{itemId,title,prompt} (solo PDFs de su biblioteca) exercise:{query (inglés),name (español),sets,reps|seconds,rest}'),
          day: z.number().int().min(1).max(30).optional().describe('Solo en retos (kind challenge): día al que pertenece el bloque'),
          source: z.string().max(160).optional().describe('Autor y obra de la técnica, si aplica'),
        })).min(2).max(20),
        durationDays: z.number().int().optional().describe('Solo retos (kind challenge): cuántos días dura, de 2 a 30'),
      }),
      execute: async (m) => {
        const parsed = parseBlocks(m.blocks.map((b, i) => ({ ...b, id: `b${i + 1}` })));
        const errors = parsed.errors;
        // Documentos: solo PDFs de la biblioteca de la persona. Libros y ejercicios se resuelven por nombre.
        const docsOk = await ownsDocuments(userId, parsed.blocks);
        const resolved = await resolveLibraryBlocks(docsOk ? parsed.blocks : parsed.blocks.filter((b) => b.type !== 'document'), { youtube: access.youtube });
        // Meditaciones, afirmaciones y manifestaciones con contenido real (agentes generadores), no solo tiempo.
        const { blocks } = await enrichGuidedBlocks(supabase, userId, await profileOf(), resolved, `${m.title}. ${m.objective}`);
        if (!docsOk) errors.push('Un bloque document usaba un PDF que no está en la biblioteca de la persona; se quitó.');
        if (blocks.length < 2) return { ok: false as const, errors: errors.slice(0, 3) };
        const { data, error } = await supabase.from('soi_blueprints').insert({
          creator_id: userId, title: m.title, objective: m.objective, kind: m.kind, source: m.source,
          blocks, steps: [], status: 'private', ...(m.kind === 'challenge' && m.durationDays && m.durationDays >= 2 ? { duration_days: Math.min(30, m.durationDays) } : {}),
        }).select('id, required_minutes').single();
        if (error) return { ok: false as const, errors: ['No se pudo guardar el Moment.'] };
        return {
          ok: true as const, id: data.id as string, title: m.title, kind: m.kind, reason: m.reason,
          minutes: data.required_minutes as number, blocks: blocks.map((b) => ({ type: b.type, title: b.title, minutes: b.minutes })),
          locked: access.routines === false,
        };
      },
    }),

    createGuidedContent: tool({
      description: 'Escribe con el agente correspondiente una meditación guiada completa, afirmaciones personales o una manifestación (qué manifestar, asunción y escena del deseo cumplido), personalizada con las metas, deseos y emociones de la persona. Se guarda en su biblioteca y se puede escuchar con voz o usar en un Moment.',
      inputSchema: z.object({
        kind: z.enum(['meditation', 'affirmations', 'manifestation']),
        intention: z.string().min(2).max(300).describe('Para qué la quiere, en sus palabras'),
        minutes: z.number().int().min(1).max(30).optional().describe('Solo meditación: duración'),
      }),
      execute: async ({ kind, intention, minutes }) => {
        if (access.routines === false) return { ok: false as const, locked: true as const };
        try {
          const profile = await profileOf();
          const g = await generateGuided(kind, await personalContext(supabase, userId, profile, intention), intention, minutes ?? 5);
          const itemId = await saveGuided(supabase, userId, g, intention, minutes);
          const preview = g.kind === 'meditation' ? g.content.script.slice(0, 220)
            : g.kind === 'affirmations' ? g.content.affirmations.slice(0, 3).join(' · ')
            : `${g.content.assumption} — ${g.content.scene.slice(0, 160)}`;
          return { ok: true as const, id: itemId, kind, title: g.content.title, preview, source: g.content.source };
        } catch {
          return { ok: false as const, locked: false as const };
        }
      },
    }),

    captureIdea: tool({
      description: 'Guarda una Idea privada cuando la persona descubre un insight valioso (inspiración → insight → reflexión). Para convertirla en acción, después usa createMoment.',
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
        // Grafo de conocimiento: el insight queda en la memoria transversal enlazado a la Idea.
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
