import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '@/types/database';
import { levelFor } from '@/config/capacities';
import { loadIdentityView } from './view';

export type IdentityGain = {
  hasIdentities: boolean;
  identities: { id: string; name: string; level: number; levelUp: boolean; evidenceCount: number }[];
  capacities: { name: string; level: number; levelUp: boolean }[];
};

/**
 * Lo que este Moment acaba de construir en la persona: qué identidades y capacidades fortaleció y si subió de nivel.
 * No es "actividad completada": es evidencia de en quién se está convirtiendo.
 */
export async function identityGains(supabase: SupabaseClient, userId: string, profile: UserProfile | null, ref: string, completedAt: string): Promise<IdentityGain> {
  const v = await loadIdentityView(supabase, userId, profile, profile?.timezone ?? 'America/Mexico_City');
  const ev = v.evidence.find((e) => e.id === `${ref}@${completedAt}`) ?? v.evidence.find((e) => e.id.startsWith(`${ref}@`));
  if (!ev) return { hasIdentities: v.active.length > 0, identities: [], capacities: [] };
  const identities = v.active.filter((i) => ev.identityIds.includes(i.id)).map((i) => ({
    id: i.id, name: i.name, level: i.level.level, evidenceCount: i.evidenceCount, levelUp: levelFor(i.xp - ev.weight).level < i.level.level,
  }));
  const capacities = v.capacities.filter((c) => ev.capacities.includes(c.name)).map((c) => ({
    name: c.name, level: c.level.level, levelUp: levelFor(c.xp - ev.weight).level < c.level.level,
  }));
  return { hasIdentities: v.active.length > 0, identities, capacities };
}
