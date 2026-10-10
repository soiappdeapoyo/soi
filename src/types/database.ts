import type { Eslabon } from '@/config/agents';

export type Plan = 'trial' | 'free' | 'soi_plus';

export type UserProfile = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio?: string | null;
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
  timezone_auto?: boolean;
  /** Avisos para volver (0033). */
  push_subscription?: unknown;
  reminder_time?: string | null;
  reminders_enabled?: boolean;
  country: string;
  available_minutes: number | null;
  weakest_link: Eslabon | null;
  plan: Plan;
  trial_ends_at: string;
  /** Alta del perfil (select *). */
  created_at?: string;
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

/** Unidad de acción reutilizable en Moments, Blueprints y el chat. */
export type ActionCard = { title: string; minutes: number; detail?: string; eslabon?: Eslabon };

export type CreatorProfile = {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  methodology: string | null;
  principles: string[];
  boundaries: string[];
  is_verified: boolean;
  is_demo: boolean;
  created_at: string;
  /** Etiqueta profesional bajo el nombre ("Coach de hábitos"). */
  category?: string | null;
  /** Destacados: grupos de Moments por tema (como las historias destacadas). */
  highlights?: unknown;
};

export type SoiBlueprint = {
  id: string;
  creator_id: string;
  moment_id: string | null;
  title: string;
  objective: string;
  required_minutes: number;
  duration_days: number;
  difficulty: 'suave' | 'media' | 'intensa';
  eslabon: Eslabon;
  target_states: string[];
  steps: ActionCard[];
  source: string;
  tier: 'free' | 'premium';
  price_cents: number;
  currency: string;
  status: 'draft' | 'published' | 'archived';
  implementations_count: number;
  completions_count: number;
  steps_completed_count: number;
  is_demo: boolean;
  created_at: string;
};

export type SoiMoment = {
  id: string;
  creator_id: string;
  author_name: string | null;
  title: string;
  category: Eslabon;
  trigger_state: string[];
  source_type: 'video' | 'book' | 'podcast' | 'personal_experience' | 'ai_generated';
  source_reference: string | null;
  insight: string;
  reflection_question: string | null;
  user_reflection: string | null;
  actions: ActionCard[];
  evidence: { completed_actions?: number; created_habits?: number; achieved_results?: string[] };
  visibility: 'private' | 'community';
  blueprint_id: string | null;
  resonance_count: number;
  save_count: number;
  is_demo: boolean;
  created_at: string;
};

export type BlueprintImplementation = {
  id: string;
  user_id: string;
  blueprint_id: string;
  adapted_steps: ActionCard[];
  adapted_minutes: number | null;
  adaptation_note: string | null;
  completed_steps: number[];
  status: 'active' | 'completed' | 'paused';
  result_note: string | null;
  started_at: string;
  last_activity_at: string;
  completed_at: string | null;
};
