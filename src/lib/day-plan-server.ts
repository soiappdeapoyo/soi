import type { SupabaseClient } from '@supabase/supabase-js';
import { DayItemsSchema, placeInDay } from '@/lib/day-plan';

/**
 * Pone un Moment en Mi día (la lista de reproducción de Hoy y de Mi Vida → Mi día). Si ya está, solo actualiza su hora.
 * Todo Moment que SOI diseña (en el chat o en la landing) llega aquí: así nunca se pierde. Nunca lanza.
 */
export async function addToMyDay(supabase: SupabaseClient, userId: string, momentId: string, time?: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('day_plans').select('items').eq('user_id', userId).maybeSingle();
    const parsed = DayItemsSchema.safeParse(data?.items ?? []);
    const items = placeInDay(parsed.success ? parsed.data : [], `m:${momentId}`, time, `d${Date.now().toString(36)}`);
    const { error } = await supabase.from('day_plans').upsert({ user_id: userId, items, updated_at: new Date().toISOString() });
    if (error) console.error('[day-plan] no se pudo agregar a Mi día', error.message);
    return !error;
  } catch (e) {
    console.error('[day-plan] Mi día', e instanceof Error ? e.message : e);
    return false;
  }
}
