import type { Eslabon } from '@/config/agents';

export type Plan = 'trial' | 'free' | 'soi_plus';

export type UserProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  archetype: string | null;
  dominant_emotion: string | null;
  recurring_themes: string[];
  spiritual_framework: string | null;
  goals: string[];
  blockers: string[];
  streak_current: number;
  streak_longest: number;
  streak_shields: number;
  last_ritual_date: string | null;
  ritual_phase: string | null;
  preferred_routine: string | null;
  onboarding_completed: boolean;
  voice_preference: string | null;
  tts_enabled: boolean;
  morning_time: string | null;
  evening_time: string | null;
  timezone: string | null;
  country: string;
  available_minutes: number | null;
  weakest_link: Eslabon | null;
  plan: Plan;
  trial_ends_at: string;
  free_queries_remaining: number;
  is_paywalled: boolean;
  stripe_customer_id: string | null;
  subscription_status: string | null;
};

export type KnowledgeRow = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  tags: string[];
  status: string;
  created_at: string;
};

export type CommunityPost = {
  id: string;
  user_id: string;
  type: 'evidencia' | 'peticion' | 'testimonio' | 'pregunta';
  content: string;
  is_anonymous: boolean;
  author_name: string | null;
  reactions: { amen: number; fuerza: number; gracias: number; corazon: number };
  is_demo: boolean;
  created_at: string;
};
