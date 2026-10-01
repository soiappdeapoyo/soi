import {
  Sparkles, Heart, Brain, Moon, TrendingUp, Clock, Target, Star, Compass, LifeBuoy,
  Users, User, Sunrise, Settings, Flame, MessageCircle, Lock, type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  Sparkles, Heart, Brain, Moon, TrendingUp, Clock, Target, Star, Compass, LifeBuoy,
  Users, User, Sunrise, Settings, Flame, MessageCircle, Lock,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  const C = MAP[name] ?? Sparkles;
  return <C aria-hidden="true" className={className ?? 'h-5 w-5'} />;
}
