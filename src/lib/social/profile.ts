import type { SupabaseClient } from '@supabase/supabase-js';
import { parseLinks, type ProfileLink } from './profile-links';

export type ProfileCard = {
  user_id: string; display_name: string; avatar_url: string | null; handle: string | null; is_verified: boolean;
  bio: string | null; links: ProfileLink[]; followers: number; following: number; posts: number; moments: number; joined_at: string;
};

export async function loadProfileCard(supabase: SupabaseClient, userId: string): Promise<ProfileCard | null> {
  const { data } = await supabase.rpc('get_profile_card', { p_id: userId });
  const row = (data ?? [])[0] as (Omit<ProfileCard, 'links'> & { links: unknown }) | undefined;
  return row ? { ...row, links: parseLinks(row.links) } : null;
}
