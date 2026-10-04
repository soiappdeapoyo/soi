import {
  Sparkles, Heart, Brain, Moon, TrendingUp, Clock, Target, Star, Compass, LifeBuoy,
  Users, User, Sunrise, Settings, Flame, MessageCircle, Lock, Layers, PenLine, Sun, Zap, Orbit,
  Wind, Timer, Eye, ListChecks, CirclePlay, Footprints, BookOpen, Smile, Coffee, PartyPopper, ArrowRight, type LucideIcon,
} from 'lucide-react';

const MAP: Record<string, LucideIcon> = {
  Sparkles, Heart, Brain, Moon, TrendingUp, Clock, Target, Star, Compass, LifeBuoy,
  Users, User, Sunrise, Settings, Flame, MessageCircle, Lock, Layers, PenLine, Sun, Zap, Orbit,
  Wind, Timer, Eye, ListChecks, CirclePlay, Footprints, BookOpen, Smile, Coffee, PartyPopper, ArrowRight,
};

/** Íconos lucide a 1.5 de trazo, tamaños coherentes 16/20/24 (por defecto 20). */
export function Icon({ name, className, strokeWidth = 1.5 }: { name: string; className?: string; strokeWidth?: number }) {
  const C = MAP[name] ?? Sparkles;
  return <C aria-hidden="true" strokeWidth={strokeWidth} style={{ strokeWidth }} className={className ?? 'h-5 w-5'} />;
}
