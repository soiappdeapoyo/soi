import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { LIFE_AREA_IDS, type LifeAreaId } from '@/config/life-areas';
import { loadIdentityView } from '@/lib/identity/view';
import { readValues } from '@/lib/values';
import type { Value } from '@/config/values';
import { buildMapView, type Assessment, type AreaScores, type LifeMap, type MapView } from '@/lib/life-map';

const isArea = (v: string): v is LifeAreaId => (LIFE_AREA_IDS as string[]).includes(v);

/** Solo áreas conocidas y calificaciones 1–10 (lo guardado por versiones anteriores no rompe la vista). */
function cleanScores(raw: unknown): AreaScores {
  const out: AreaScores = {};
  if (raw && typeof raw === 'object') {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (isArea(k) && typeof v === 'number' && v >= 1 && v <= 10) out[k] = Math.round(v);
    }
  }
  return out;
}

/** El mapa y sus mediciones, una vez por petición. Si las tablas aún no existen, como si no hubiera mapa. */
export const loadLifeMap = cache(async (supabase: SupabaseClient, userId: string): Promise<{ map: LifeMap | null; assessments: Assessment[] }> => {
  const [{ data: m }, { data: a }] = await Promise.all([
    supabase.from('life_maps').select('vision, focus_areas, areas, created_at, updated_at').eq('user_id', userId).maybeSingle(),
    supabase.from('life_assessments').select('id, kind, scores, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(60),
  ]);
  const map: LifeMap | null = m ? {
    vision: (m.vision as string | null) ?? null,
    focus_areas: ((m.focus_areas as string[] | null) ?? []).filter(isArea),
    areas: (m.areas as LifeMap['areas'] | null) ?? {},
    created_at: m.created_at as string, updated_at: m.updated_at as string,
  } : null;
  const assessments = (a ?? []).map((r) => ({ id: r.id as string, kind: r.kind as Assessment['kind'], scores: cleanScores(r.scores), created_at: r.created_at as string }));
  return { map, assessments };
});

/** El mapa con la evidencia de Mi Nuevo Yo por área (sus capacidades). */
export async function loadMapView(supabase: SupabaseClient, userId: string, profile: UserProfile | null, timeZone: string): Promise<MapView> {
  const [{ map, assessments }, identity] = await Promise.all([
    loadLifeMap(supabase, userId),
    loadIdentityView(supabase, userId, profile, timeZone).catch(() => null),
  ]);
  return buildMapView(map, assessments, identity?.evidence ?? []);
}

/** Los valores que eligió (consulta aparte: si la columna aún no existe, como si no hubiera). */
export const loadValues = cache(async (supabase: SupabaseClient, userId: string): Promise<Value[]> => {
  const { data, error } = await supabase.from('life_maps').select('core_values').eq('user_id', userId).maybeSingle();
  return error ? [] : readValues(data?.core_values);
});
