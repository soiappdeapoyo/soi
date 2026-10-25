import { randomBytes } from 'node:crypto';
import { after } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  PERSONS_TRIAL_DAYS, REFERRAL_ACTIVATION_MESSAGES, REFERRAL_CODE_RE, REFERRAL_FIRST_DAYS, REFERRAL_MAX_REWARDED, REFERRAL_NEXT_DAYS,
} from './entitlements';

/**
 * Invitaciones de /persons: compartes tu link (/persons/entrar?ref=<código>); quien se registra con él queda ligado a
 * ti y, cuando de verdad empieza a practicar (sus primeros mensajes), ganas días de prueba: 7 la primera vez y 2 por
 * cada persona después (ver `activate_referral`, 0045). Todo lo escribe el servidor.
 */

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function newCode() {
  const bytes = randomBytes(8);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('');
}

/** El código de invitación de la cuenta (se crea la primera vez). */
export async function ensureReferralCode(userId: string): Promise<string> {
  const db = createAdminClient();
  const { data } = await db.from('user_profiles').select('referral_code').eq('user_id', userId).maybeSingle();
  if (data?.referral_code) return data.referral_code as string;
  for (let i = 0; i < 5; i++) {
    const code = newCode();
    const { data: set, error } = await db.from('user_profiles').update({ referral_code: code }).eq('user_id', userId).is('referral_code', null).select('referral_code');
    if (!error && set?.length) return code;
    if (!error) {
      const { data: again } = await db.from('user_profiles').select('referral_code').eq('user_id', userId).maybeSingle();
      if (again?.referral_code) return again.referral_code as string;
    }
  }
  throw new Error('no se pudo crear el código de invitación');
}

/**
 * Al registrarse en /persons: prueba de 3 días y, si llegó con un link de invitación, queda ligada a quien la invitó
 * (nunca a sí misma; una sola vez por cuenta).
 */
export async function onPersonsSignup(userId: string, createdAt: string, ref: string | null) {
  const db = createAdminClient();
  const ends = new Date(Date.parse(createdAt) + PERSONS_TRIAL_DAYS * 86_400_000).toISOString();
  const { error } = await db.from('user_profiles').update({ trial_ends_at: ends }).eq('user_id', userId).eq('plan', 'trial');
  if (error) console.error('[persons] prueba de 3 días', error.message);
  if (!ref || !REFERRAL_CODE_RE.test(ref)) return;
  const { data: referrer } = await db.from('user_profiles').select('user_id, app_role').eq('referral_code', ref).maybeSingle();
  if (!referrer || referrer.user_id === userId || referrer.app_role !== 'persons') return;
  const { error: e } = await db.from('persons_referrals').insert({ referrer_id: referrer.user_id, referred_id: userId });
  if (e && !/duplicate|unique/i.test(e.message)) console.error('[persons] invitación', e.message);
}

/** Después de un mensaje propio: si con este ya empezó a practicar, la invitación se activa y quien invitó gana días. */
export async function maybeActivateReferral(userId: string) {
  const db = createAdminClient();
  const { count } = await db.from('persona_messages').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('role', 'user');
  if ((count ?? 0) < REFERRAL_ACTIVATION_MESSAGES) return;
  const { data: pending } = await db.from('persons_referrals').select('id').eq('referred_id', userId).is('activated_at', null).maybeSingle();
  if (!pending) return;
  const { error } = await db.rpc('activate_referral', { p_referred: userId, p_first: REFERRAL_FIRST_DAYS, p_next: REFERRAL_NEXT_DAYS, p_max: REFERRAL_MAX_REWARDED });
  if (error) console.error('[persons] activar invitación', error.message);
}

export function scheduleReferralCheck(userId: string) {
  const run = () => maybeActivateReferral(userId).catch(() => undefined);
  try { after(run); } catch { void run(); }
}

export type ReferralRow = { id: string; created_at: string; activated_at: string | null; reward_days: number; rewarded_at: string | null; name: string | null };

/** Tus invitaciones (nombre de pila de quien se registró, si lo tiene) y los días ganados. */
export async function loadReferrals(userId: string) {
  const db = createAdminClient();
  const { data } = await db.from('persons_referrals').select('id, referred_id, created_at, activated_at, reward_days, rewarded_at')
    .eq('referrer_id', userId).order('created_at', { ascending: false }).limit(50);
  const rows = (data ?? []) as (Omit<ReferralRow, 'name'> & { referred_id: string })[];
  const ids = rows.map((r) => r.referred_id);
  const { data: profiles } = ids.length ? await db.from('user_profiles').select('user_id, display_name').in('user_id', ids) : { data: [] };
  const names = new Map(((profiles ?? []) as { user_id: string; display_name: string | null }[]).map((p) => [p.user_id, p.display_name?.trim().split(/\s+/)[0] ?? null]));
  const list: ReferralRow[] = rows.map(({ referred_id, ...r }) => ({ ...r, name: names.get(referred_id) ?? null }));
  return {
    list,
    days: list.reduce((n, r) => n + (r.reward_days ?? 0), 0),
    active: list.filter((r) => r.activated_at).length,
    /** La última vez que ganaste días (para el aviso en la lista de chats). */
    lastReward: list.find((r) => r.rewarded_at && r.reward_days > 0) ?? null,
  };
}
