import { after } from 'next/server';
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
import { generateAutosuggestion, generateGuided, personalContext, saveGuided } from './content-agents';
import { HillPatchSchema, loadHillMemory, saveHillMemory } from './hill-memory';
import { ENEMY_IDS } from '@/config/enemies';
import { recordEnemy } from '@/lib/battles';
import { scheduleAutoCover } from '@/lib/moments/auto-cover';
import { createAdminClient } from '@/lib/supabase/server';
import { PROPOSAL_TOOLS } from './proposal-gate';
import { forkOfficial, getMoment } from '@/lib/moments/server';
import { isNearDuplicate } from '@/lib/moments/reuse';
import { MOMENT_FIELDS, toMomentFlow } from '@/lib/moments/types';
import type { VideoPolicy } from '@/lib/momentum';
import type { UserProfile } from '@/types/database';

type Ctx = {
  supabase: SupabaseClient;
  userId: string;
  authorName?: string | null;
  access: { youtube: boolean; evidence: boolean; routines?: boolean; ritual?: boolean };
  /** Un solo video por respuesta, según el estado (`videoPolicy`). Por defecto, video rápido. */
  video?: VideoPolicy;
  /** Cuenta de creador: sin herramientas que generan contenido (Moments, meditaciones, afirmaciones). */
  creator?: boolean;
  /** false = escuchar o pedir permiso: sin herramientas que proponen (ver proposalMode). */
  proposals?: boolean;
};

/** Herramientas que generan contenido: una cuenta de creador no las tiene (todo su contenido es suyo). */
export const CONTENT_TOOLS = ['createMoment', 'createGuidedContent'] as const;

export function buildTools(ctx: Ctx): ReturnType<typeof allTools> {
  const tools = allTools(ctx);
  // Cuenta de creador: la IA acompaña, no genera. Escuchar primero: sin propuestas hasta que haya permiso.
  // (El tipo se conserva para quien llama; estas claves no viajan al modelo.)
  const off = new Set<string>([...(ctx.creator ? CONTENT_TOOLS : []), ...(ctx.proposals === false ? PROPOSAL_TOOLS : [])]);
  if (!off.size) return tools;
  return Object.fromEntries(Object.entries(tools).filter(([k]) => !off.has(k))) as ReturnType<typeof allTools>;
}

function allTools({ supabase, userId, authorName, access, video = 'quick' }: Ctx) {
  // Un solo video por respuesta: lo que se muestre primero cierra la puerta al otro.
  let videoShown = false;
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
        if (video !== 'quick' || videoShown) {
          return { locked: false as const, videos: [], skipped: video === 'in_moment' ? 'El video va dentro del Moment.' : 'Ahora no conviene un video: responde sin él.' };
        }
        videoShown = true;
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
      description: 'Diseña un SOI Moment ÚNICO para esta persona: un flujo corto de acciones (3 a 6) con intención, objetivo y resultado esperado, listo para comenzar. Primero llena `understanding` con lo que te contó (sus palabras) y úsalo en el título y en cada paso. Nada genérico.',
      inputSchema: z.object({
        understanding: z.object({
          situation: z.string().min(10).max(300).describe('Qué le pasa, con sus palabras y un detalle concreto'),
          feeling: z.string().min(3).max(160).describe('Cómo lo siente (cuerpo, mente, emoción)'),
          wants: z.string().min(3).max(200).describe('Qué quiere sentir o lograr al terminar'),
          minutes: z.number().int().min(1).max(120).optional().describe('Tiempo que tiene ahora, si lo dijo'),
        }).describe('Lo que entendiste de esta persona antes de diseñar'),
        libraryCheck: z.string().min(8).max(240).describe('Qué revisaste de SU BIBLIOTECA: cuál ajustas (y pones en basedOn) o por qué ninguno de sus Moments encaja con lo que contó'),
        title: z.string().min(3).max(80).describe('Nombre evocador, p. ej. "Reconectar"'),
        objective: z.string().min(3).max(300).describe('El cambio emocional, mental o conductual que busca'),
        kind: MomentKindSchema.describe('recovery para ansiedad, tristeza o falta de enfoque; growth para metas; learning si parte de un libro o video; daily si se repetirá; challenge para retos de varios días (usa day en cada bloque)'),
        reason: z.string().max(160).describe('Por qué este Moment ahora, en una frase cálida'),
        source: z.string().min(2).max(200).describe('Autores en los que se basa, p. ej. "Diseñado por SOI · basado en Brian Tracy y Joe Dispenza"'),
        blocks: z.array(z.object({
          type: z.enum(ACTION_TYPES.filter((t) => t !== 'moment' && t !== 'image') as [ActionType, ...ActionType[]]), // la imagen la sube una persona
          title: z.string().min(2).max(80),
          minutes: z.number().int().min(1).max(30),
          config: z.record(z.unknown()).describe('breathing:{inhale,exhale} meditation:{guide} timer:{instruction} writing:{prompt} visualization:{scene} checklist:{items[]} video:{query} walk:{instruction} gratitude:{count} reading:{book,pages} reflection:{question} affirmation:{text,repeat} goal:{prompt} emotion_log:{question} rest:{instruction,variant} celebration:{message} next_step:{instruction} canvas:{prompt} mind_map:{center,branches} quiz:{questions:[{q,options[],answer,explain}]} music:{query} audio:{mode:"record",prompt} photo:{prompt} agenda:{prompt,defaultTime:"HH:MM"} pomodoro:{focus,rest,cycles} contract:{commitment,consequence} weekly_review:{} tracking:{metric,unit,target} stretching:{sequence[],secondsEach} book:{title,author,mode:"summary"|"read",pages} document:{itemId,title,prompt} (solo PDFs de su biblioteca) exercise:{query (inglés),name (español),sets,reps|seconds,rest}'),
          day: z.number().int().min(1).max(30).optional().describe('Solo en retos (kind challenge): día al que pertenece el bloque'),
          source: z.string().max(160).optional().describe('Autor y obra de la técnica, si aplica'),
        })).min(2).max(20),
        durationDays: z.number().int().optional().describe('Solo retos (kind challenge): cuántos días dura, de 2 a 30'),
        basedOn: z.string().max(60).optional().describe('id de un Moment que ya tiene y que estás ajustando: se guarda como nueva versión de ese mismo Moment (no uno nuevo)'),
      }),
      execute: async (m) => {
        const parsed = parseBlocks(m.blocks.map((b, i) => ({ ...b, id: `b${i + 1}` })));
        const errors = parsed.errors;
        // Un solo video por respuesta: si ya hubo video rápido (o no conviene), el Moment va sin bloque video.
        if ((video !== 'in_moment' || videoShown) && parsed.blocks.some((b) => b.type === 'video')) {
          parsed.blocks = parsed.blocks.filter((b) => b.type !== 'video');
          errors.push('Se quitó el bloque video: en esta respuesta no corresponde un video dentro del Moment.');
        }
        if (parsed.blocks.some((b) => b.type === 'video')) videoShown = true;
        // Documentos: solo PDFs de la biblioteca de la persona. Libros y ejercicios se resuelven por nombre.
        const docsOk = await ownsDocuments(userId, parsed.blocks);
        // Libros y ejercicios por nombre (rápido). El contenido guiado (meditación, manifestación…) lo escriben los agentes
        // la primera vez que se abre el Moment (con pantalla de "Preparando tu Moment…"), para que el chat responda ya.
        const blocks = await resolveLibraryBlocks(docsOk ? parsed.blocks : parsed.blocks.filter((b) => b.type !== 'document'), { youtube: access.youtube });
        if (!docsOk) errors.push('Un bloque document usaba un PDF que no está en la biblioteca de la persona; se quitó.');
        if (blocks.length < 2) return { ok: false as const, errors: errors.slice(0, 3) };
        const proposal = (id: string, minutes: number, extra: Record<string, unknown> = {}) => ({
          ok: true as const, id, title: m.title, kind: m.kind, reason: m.reason, minutes,
          blocks: blocks.map((b) => ({ type: b.type, title: b.title, minutes: b.minutes })), locked: access.routines === false, ...extra,
        });
        // Ajustar uno existente: nueva versión del mismo Moment (propio) o tu copia de un oficial.
        if (m.basedOn) {
          const base = await getMoment(supabase, m.basedOn);
          if (base?.official) {
            const id = await forkOfficial(supabase, userId, base, blocks).catch(() => null);
            if (id) return proposal(id, blocks.reduce((a, b) => a + b.minutes, 0), { adjusted: true });
          } else if (base && base.creator_id === userId) {
            const { error: vErr } = await supabase.rpc('save_moment_version', { p_id: base.id, p_blocks: blocks, p_note: m.reason.slice(0, 160) });
            if (!vErr) return proposal(base.id, blocks.reduce((a, b) => a + b.minutes, 0), { adjusted: true, title: base.title, cover: base.cover });
          }
        }
        // Freno: casi idéntico a uno que ya tiene → se ofrece ese, no se duplica.
        const { data: mine } = await supabase.from('soi_blueprints').select(MOMENT_FIELDS).eq('creator_id', userId).neq('status', 'archived')
          .order('updated_at', { ascending: false }).limit(40);
        const twin = (mine ?? []).map(toMomentFlow).find((x) => isNearDuplicate({ title: m.title, objective: m.objective, blocks }, x));
        if (twin) return { ...proposal(twin.id, twin.required_minutes, { reused: true, cover: twin.cover }), title: twin.title, blocks: twin.blocks.map((b) => ({ type: b.type, title: b.title, minutes: b.minutes })) };
        const { data, error } = await supabase.from('soi_blueprints').insert({
          creator_id: userId, title: m.title, objective: m.objective, kind: m.kind, source: m.source,
          blocks, steps: [], status: 'private', ...(m.kind === 'challenge' && m.durationDays && m.durationDays >= 2 ? { duration_days: Math.min(30, m.durationDays) } : {}),
        }).select('id, required_minutes').single();
        if (error) return { ok: false as const, errors: ['No se pudo guardar el Moment.'] };
        // Lo que entendió se vuelve memoria (para personalizar los siguientes), después de responder.
        if (m.understanding) {
          const u = m.understanding;
          const write = () => remember(createAdminClient(), {
            user_id: userId, category: 'pensamiento', tags: ['contexto_moment'],
            title: `Para «${m.title}»`.slice(0, 120),
            content: `Situación: ${u.situation}\nSiente: ${u.feeling}\nQuiere: ${u.wants}${u.minutes ? `\nTiempo: ${u.minutes} min` : ''}`.slice(0, 1000),
            metadata: { moment_id: data.id },
          }).then(() => undefined);
          try { after(write); } catch { void write(); }
        }
        // Portada aesthetic automática (después de responder: el chat no espera).
        scheduleAutoCover(data.id as string, { title: m.title, objective: m.objective, kind: m.kind, blocks });
        return {
          ok: true as const, id: data.id as string, title: m.title, kind: m.kind, reason: m.reason,
          minutes: data.required_minutes as number, blocks: blocks.map((b) => ({ type: b.type, title: b.title, minutes: b.minutes })),
          locked: access.routines === false,
        };
      },
    }),

    registerEnemy: tool({
      description: 'Registra en silencio que apareció un enemigo interior (un patrón, no un diagnóstico) cuando lo reconoces en lo que cuenta la persona. Incluye sus palabras como evidencia y, si aplica, la meta en juego.',
      inputSchema: z.object({
        enemy: z.enum(ENEMY_IDS),
        evidence: z.string().max(300).describe('La frase de la persona que lo muestra'),
        goal: z.string().max(160).optional().describe('La meta afectada, si la hay'),
      }),
      execute: async ({ enemy, evidence, goal }) => ({ ok: await recordEnemy(userId, enemy, { source: 'chat', evidence, goal }) }),
    }),

    updateHillPlan: tool({
      description: 'Napoleon Hill: guarda o actualiza la memoria longitudinal del propósito de la persona (propósito principal definido, meta, fecha, por qué, qué dará a cambio, plan, obstáculo, miedo, conocimiento que falta, mastermind, etapa del ciclo, compromisos). Úsala en silencio cuando la persona defina o cambie algo.',
      inputSchema: HillPatchSchema,
      execute: async (patch) => ({ ok: await saveHillMemory(supabase, userId, patch) }),
    }),

    offerMoment: tool({
      description: 'Ofrece un Moment que la persona YA tiene (o uno oficial) tal cual, en lugar de diseñar uno nuevo. Usa el id de la lista "MOMENTS QUE YA TIENE".',
      inputSchema: z.object({
        id: z.string().min(2).max(60).describe('id del Moment (uuid) u oficial (slug)'),
        reason: z.string().max(160).describe('Por qué este Moment ahora, en una frase cálida'),
      }),
      execute: async ({ id, reason }) => {
        const mo = await getMoment(supabase, id);
        if (!mo || (!mo.official && mo.creator_id !== userId && mo.status !== 'published')) return { ok: false as const, errors: ['Ese Moment no está disponible. Diseña uno con createMoment.'] };
        return {
          ok: true as const, id: mo.official ? mo.slug! : mo.id, title: mo.title, kind: mo.kind, reason, minutes: mo.required_minutes,
          blocks: mo.blocks.map((b) => ({ type: b.type, title: b.title, minutes: b.minutes })), locked: access.routines === false, reused: true, cover: mo.cover,
        };
      },
    }),

    createGuidedContent: tool({
      description: 'Escribe con el agente correspondiente una meditación guiada completa, afirmaciones personales o una manifestación (qué manifestar, asunción y escena del deseo cumplido), personalizada con las metas, deseos y emociones de la persona. Se guarda en su biblioteca y se puede escuchar con voz o usar en un Moment.',
      inputSchema: z.object({
        kind: z.enum(['meditation', 'affirmations', 'manifestation', 'autosuggestion']).describe('autosuggestion: autosugestión de Napoleon Hill (declaración del deseo para mañana y noche)'),
        intention: z.string().min(2).max(300).describe('Para qué la quiere, en sus palabras'),
        minutes: z.number().int().min(1).max(30).optional().describe('Solo meditación: duración'),
      }),
      execute: async ({ kind, intention, minutes }) => {
        if (access.routines === false) return { ok: false as const, locked: true as const };
        try {
          const profile = await profileOf();
          const ctx = await personalContext(supabase, userId, profile, intention);
          const g = kind === 'autosuggestion'
            ? { kind: 'affirmations' as const, content: await generateAutosuggestion(ctx, intention, (await loadHillMemory(supabase, userId)).memory) }
            : await generateGuided(kind, ctx, intention, minutes ?? 5);
          const itemId = await saveGuided(supabase, userId, g, intention, minutes);
          const preview = g.kind === 'meditation' ? g.content.script.slice(0, 220)
            : g.kind === 'affirmations' ? g.content.affirmations.slice(0, 3).join(' · ')
            : `${g.content.assumption} — ${g.content.scene.slice(0, 160)}`;
          return { ok: true as const, id: itemId, kind: g.kind, title: g.content.title, preview, source: g.content.source };
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
