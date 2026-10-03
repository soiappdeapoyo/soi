import Link from 'next/link';
import { ArrowRight, Lock, Sunrise, Timer, Star } from 'lucide-react';

export type Practice = {
  kind: 'routine' | 'ritual' | 'evidence';
  href: string;
  label: string;
  detail: string;
  reason?: string;
  locked: boolean;
};

const ICONS = { routine: Timer, ritual: Sunrise, evidence: Star } as const;

/**
 * Acción que el agente propone dentro de la conversación: un solo toque para empezar.
 * Tarjeta blanca con anillo (radio 14 = ícono 8 + padding 6), sin animación de entrada propia:
 * llega como parte del mensaje.
 */
export function PracticeCard({ practice }: { practice: Practice }) {
  const Icon = practice.locked ? Lock : ICONS[practice.kind];
  const href = practice.locked ? '/planes' : practice.href;
  return (
    <Link
      href={href}
      className="press group mt-3 flex max-w-sm items-center gap-3 rounded-[14px] bg-white p-1.5 pr-3 shadow-ring hover:shadow-soft"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-soi-accent-soft text-soi-accent" aria-hidden="true">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-soi-ink">{practice.label}</span>
        <span className="block truncate text-xs text-soi-muted">
          {practice.locked ? 'Disponible en SOI+' : practice.reason || practice.detail}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-soi-subtle transition-transform duration-(--dur-fast) ease-out-strong group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}
