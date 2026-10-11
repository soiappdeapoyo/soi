import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/server';
import { parseBlocks } from '@/config/actions';
import { remember } from '@/lib/ai/rag';
import { scheduleAutoCover } from '@/lib/moments/auto-cover';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El Moment que SOI diseñó en el chat de la landing (sin cuenta) se vuelve de la persona al entrar:
 * se reclama una sola vez (el primero que entra con el enlace), se copia a soi_blueprints como privado y
 * lo que contó pasa a la memoria. Volver a abrir el enlace lleva al mismo Moment. Devuelve su id o null.
 */
export async function claimDraft(supabase: SupabaseClient, userId: string, token: string, visitor: string | null): Promise<string | null> {
  if (!UUID.test(token)) return null;
  const admin = createAdminClient();
  const { data: draft } = await admin.from('moment_drafts').select('*').eq('id', token).maybeSingle();
  if (!draft) return null;
  if (draft.claimed_by) return draft.claimed_by === userId ? (draft.moment_id as string | null) : null;

  // Reclamar primero (condicional): dos pestañas o dos cuentas no crean dos Moments.
  const { data: won } = await admin.from('moment_drafts').update({ claimed_by: userId, claimed_at: new Date().toISOString() })
    .eq('id', token).is('claimed_by', null).select('id');
  if (!won?.length) return null;

  const { blocks } = parseBlocks(draft.blocks);
  const { data, error } = await supabase.from('soi_blueprints').insert({
    creator_id: userId, title: draft.title, objective: draft.objective, kind: draft.kind, source: draft.source,
    blocks, steps: [], status: 'private',
  }).select('id').single();
  if (error || !data) {
    console.error('[drafts] no se pudo guardar el Moment', error?.message);
    await admin.from('moment_drafts').update({ claimed_by: null, claimed_at: null }).eq('id', token); // que pueda reintentar
    return null;
  }
  const id = data.id as string;
  await admin.from('moment_drafts').update({ moment_id: id }).eq('id', token);

  scheduleAutoCover(id, { title: draft.title, objective: draft.objective, kind: draft.kind, blocks, context: draft.context, part: draft.part });
  const later = async () => {
    if (draft.context) {
      await remember(admin, {
        user_id: userId, category: 'pensamiento', tags: ['contexto_moment', 'landing'],
        title: `Para «${draft.title}»`.slice(0, 120), content: `Lo que contó al llegar a SOI: ${draft.context}`.slice(0, 1000),
        metadata: { moment_id: id },
      });
    }
    const { error: fe } = await admin.from('funnel_events').insert({ visitor_id: visitor, event: 'chat_claim', user_id: userId, detail: draft.author ?? 'general' });
    if (fe) console.error('[drafts] embudo', fe.message);
  };
  try { after(later); } catch { void later(); }
  return id;
}
