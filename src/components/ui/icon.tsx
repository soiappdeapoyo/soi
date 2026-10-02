import {
  Sparkles, Heart, Brain, Moon, TrendingUp, Clock, Target, Star, Compass, LifeBuoy,
  Users, User, Sunrise, Settings, Flame, MessageCircle, Lock, type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  Sparkles, Heart, Brain, Moon, TrendingUp, Clock, Target, Star, Compass, LifeBuoy,
  Users, User, Sunrise, Settings, Flame, MessageCircle, Lock,
};

/** Íconos lucide a 1.5 de trazo, tamaños coherentes 16/20/24 (por defecto 20). */
export function Icon({ name, className }: { name: string; className?: string }) {
  const C = MAP[name] ?? Sparkles;
  return <C aria-hidden="true" strokeWidth={1.5} className={className ?? 'h-5 w-5'} />;
}
