import { cache } from 'react';
import { z } from 'zod/v3';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * Ajustes editables desde /panel (tabla app_settings, solo servidor). Valores por defecto = los de siempre; si la
 * tabla no responde, la app sigue con ellos. Rangos acotados para que un error de tipeo no rompa la app.
 */
export const SettingsSchema = z.object({
  trialDays: z.number().int().min(0).max(60),
  freeQueryLimit: z.number().int().min(0).max(1000),
  ttsDailyMinutes: z.number().int().min(0).max(600),
  /** Máximo de tokens por respuesta del chat (0 = sin tope propio). */
  chatMaxOutputTokens: z.number().int().min(0).max(8000),
  /** Tokens por persona y día (0 = sin límite). */
  dailyTokenLimitFree: z.number().int().min(0).max(5_000_000),
  dailyTokenLimitPlus: z.number().int().min(0).max(5_000_000),
  plans: z.object({
    monthly: z.object({ price: z.number().min(0).max(999), stripePriceId: z.string().regex(/^price_[A-Za-z0-9]+$/).nullable() }),
    yearly: z.object({ price: z.number().min(0).max(9999), stripePriceId: z.string().regex(/^price_[A-Za-z0-9]+$/).nullable() }),
  }),
});
export type AppSettings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: AppSettings = {
  trialDays: 7, freeQueryLimit: 20, ttsDailyMinutes: 20, chatMaxOutputTokens: 0, dailyTokenLimitFree: 0, dailyTokenLimitPlus: 0,
  plans: { monthly: { price: 4.99, stripePriceId: null }, yearly: { price: 29.99, stripePriceId: null } },
};

/** Columna (snake_case en la tabla) ↔ campo. */
export const SETTING_KEYS: Record<keyof AppSettings, string> = {
  trialDays: 'trial_days', freeQueryLimit: 'free_query_limit', ttsDailyMinutes: 'tts_daily_minutes',
  chatMaxOutputTokens: 'chat_max_output_tokens', dailyTokenLimitFree: 'daily_token_limit_free', dailyTokenLimitPlus: 'daily_token_limit_plus', plans: 'plans',
};

/** Une lo guardado con los valores por defecto; lo inválido se ignora campo a campo. */
export function mergeSettings(rows: { key: string; value: unknown }[]): AppSettings {
  const out: AppSettings = structuredClone(DEFAULT_SETTINGS);
  for (const [field, key] of Object.entries(SETTING_KEYS) as [keyof AppSettings, string][]) {
    const row = rows.find((r) => r.key === key);
    if (!row) continue;
    const check = SettingsSchema.shape[field].safeParse(row.value);
    if (check.success) (out as Record<string, unknown>)[field] = check.data;
  }
  return out;
}

let memo: { at: number; value: AppSettings } | null = null;

/** Ajustes vigentes (por petición y 60 s en memoria). */
export const getSettings = cache(async (): Promise<AppSettings> => {
  if (memo && Date.now() - memo.at < 60_000) return memo.value;
  try {
    const { data, error } = await createAdminClient().from('app_settings').select('key, value');
    if (error) throw error;
    const value = mergeSettings((data ?? []) as { key: string; value: unknown }[]);
    memo = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULT_SETTINGS;
  }
});

export function forgetSettings() { memo = null; }
