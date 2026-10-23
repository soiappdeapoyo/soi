import { createAdminClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/billing/stripe';
import { loadSubscription } from '@/lib/billing/subscription';
import { USER_BUCKETS, USER_TABLES, mergeRows, sanitizeRow } from '@/lib/account/rules';

type Admin = ReturnType<typeof createAdminClient>;
const PAGE = 1000;
/** Los enlaces de los archivos privados en la exportación duran 7 días. */
const SIGNED_SECONDS = 7 * 86_400;

/** Tablas sin columna `id` (pocas filas por persona): se leen sin orden. */
const NO_ID = new Set(['community_reactions', 'creator_profiles', 'day_plans', 'dm_reads', 'dm_reports', 'follows', 'identity_links', 'identity_stories', 'life_maps', 'moment_interactions', 'post_likes', 'post_reports', 'post_saves', 'soi_openers', 'tts_usage', 'user_blocks', 'user_profiles']);

async function rowsOf(db: Admin, table: string, col: string, userId: string) {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; ; from += PAGE) {
    const q = db.from(table).select('*').eq(col, userId);
    // Orden estable para paginar sin saltarse ni repetir filas.
    const { data, error } = await (NO_ID.has(table) ? q : q.order('id')).range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < PAGE) return out;
  }
}

/** Todas las rutas de archivos bajo `<userId>/` de un bucket (Storage no lista en recursivo). */
async function filesIn(db: Admin, bucket: string, prefix: string): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(bucket).list(prefix, { limit: PAGE, offset });
    if (error) throw new Error(`${bucket}: ${error.message}`);
    for (const f of data ?? []) {
      const path = `${prefix}/${f.name}`;
      // Sin id es una carpeta.
      if (f.id) out.push(path); else out.push(...(await filesIn(db, bucket, path)));
    }
    if (!data || data.length < PAGE) return out;
  }
}

/** Todo lo de una persona en un JSON: cuenta, cada tabla y sus archivos (con enlace temporal). */
export async function exportUserData(userId: string) {
  const db = createAdminClient();
  const { data: auth } = await db.auth.admin.getUserById(userId);
  if (!auth?.user) return null;
  const u = auth.user;

  const tables: Record<string, Record<string, unknown>[]> = {};
  const errors: string[] = [];
  await Promise.all(Object.entries(USER_TABLES).map(async ([table, cols]) => {
    try {
      const groups = await Promise.all(cols.map((c) => rowsOf(db, table, c, userId)));
      const rows = mergeRows(groups).map(sanitizeRow);
      if (rows.length) tables[table] = rows;
    } catch (e) {
      errors.push(e instanceof Error ? e.message : table);
    }
  }));

  const files: { bucket: string; path: string; url: string | null }[] = [];
  for (const bucket of USER_BUCKETS) {
    try {
      const paths = await filesIn(db, bucket, userId);
      if (!paths.length) continue;
      const { data } = await db.storage.from(bucket).createSignedUrls(paths, SIGNED_SECONDS);
      for (const p of paths) files.push({ bucket, path: p, url: data?.find((d) => d.path === p)?.signedUrl ?? null });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : bucket);
    }
  }

  return {
    exported_at: new Date().toISOString(),
    note: 'Tus datos en SOI. Los enlaces de tus archivos vencen en 7 días.',
    account: {
      id: u.id, email: u.email ?? null, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at ?? null,
      providers: (u.app_metadata?.providers as string[] | undefined) ?? [u.app_metadata?.provider].filter(Boolean),
      name: (u.user_metadata?.full_name ?? u.user_metadata?.name ?? null) as string | null,
    },
    tables: Object.fromEntries(Object.entries(tables).sort(([a], [b]) => a.localeCompare(b))),
    files,
    ...(errors.length ? { incomplete: errors } : {}),
  };
}

export type DeleteResult = { ok: true } | { ok: false; message: string };

/**
 * Borra la cuenta de verdad: cancela la suscripción de Stripe (sin cobros nuevos), borra sus archivos y los borradores
 * de la landing que reclamó, y elimina el usuario de Auth (el resto se borra en cascada). Se detiene antes de borrar si
 * algo de eso falla, para no dejar a alguien sin cuenta pero cobrándole.
 */
export async function deleteUserAccount(userId: string): Promise<DeleteResult> {
  const db = createAdminClient();
  const { data: profile } = await db.from('user_profiles').select('stripe_customer_id, stripe_subscription_id').eq('user_id', userId).maybeSingle();

  // Quien vendió Moments: las compras de otras personas dependen de esos Moments (la base no deja borrarlos).
  const { count: sales } = await db.from('blueprint_purchases').select('id', { count: 'exact', head: true }).eq('creator_id', userId);
  if (sales) return { ok: false, message: 'Esta cuenta tiene ventas de Moments. Escríbenos para cerrarla sin afectar a quienes los compraron.' };

  if (profile?.stripe_customer_id || profile?.stripe_subscription_id) {
    try {
      const sub = await loadSubscription(profile.stripe_customer_id as string | null, profile.stripe_subscription_id as string | null);
      if (sub && !['canceled', 'incomplete_expired'].includes(sub.status)) await getStripe().subscriptions.cancel(sub.id);
    } catch (e) {
      console.error('[account] no se pudo cancelar en Stripe', e instanceof Error ? e.message : e);
      return { ok: false, message: 'No pudimos cancelar tu suscripción. Intenta de nuevo en unos minutos.' };
    }
  }

  for (const bucket of USER_BUCKETS) {
    try {
      const paths = await filesIn(db, bucket, userId);
      for (let i = 0; i < paths.length; i += PAGE) {
        const { error } = await db.storage.from(bucket).remove(paths.slice(i, i + PAGE));
        if (error) throw new Error(error.message);
      }
    } catch (e) {
      console.error('[account] archivos', bucket, e instanceof Error ? e.message : e);
      return { ok: false, message: 'No pudimos borrar tus archivos. Intenta de nuevo en unos minutos.' };
    }
  }

  await db.from('moment_drafts').delete().eq('claimed_by', userId);
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) {
    console.error('[account] no se pudo borrar el usuario', error.message);
    return { ok: false, message: 'No pudimos borrar la cuenta. Intenta de nuevo en unos minutos.' };
  }
  return { ok: true };
}
