'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AGENTS, ESLABON_LABEL, type AgentId, type Eslabon } from '@/config/agents';
import { cn } from '@/lib/utils';

const ESLABONES: Eslabon[] = ['pensamiento', 'emocion', 'accion', 'resultado'];

/** Agentes de cada eslabón (derivado de AGENTS, sin duplicar configuración). */
const AGENTS_BY_ESLABON: Record<Eslabon, AgentId[]> = ESLABONES.reduce((acc, e) => {
  acc[e] = (Object.keys(AGENTS) as AgentId[]).filter((id) => AGENTS[id].eslabon === e);
  return acc;
}, {} as Record<Eslabon, AgentId[]>);

function agentHref(id: AgentId) {
  if (id === 'rutinas') return '/rutinas';
  if (id === 'evidencias') return '/evidencias';
  return `/chat?agent=${id}`;
}

/**
 * Principio SOI: Pensamientos → Emociones → Acciones → Resultados.
 * Control segmentado (bandeja p-1 16 px + segmento 12 px, concéntrico) y chips con los agentes del eslabón.
 * Cambiar de eslabón es de alta frecuencia: solo cambia sombra/fondo (150 ms), sin desplazamientos.
 */
export function PrincipioNav({ initial = 'pensamiento', className }: { initial?: Eslabon; className?: string }) {
  const [eslabon, setEslabon] = useState<Eslabon>(initial);

  return (
    <nav aria-label="Principio SOI" className={cn('flex flex-col gap-3', className)}>
      <div role="tablist" aria-label="Eslabón" className="grid grid-cols-2 gap-1 rounded-2xl bg-soi-tray p-1 sm:grid-cols-4">
        {ESLABONES.map((e) => {
          const selected = e === eslabon;
          return (
            <button
              key={e}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="principio-agents"
              id={`tab-${e}`}
              onClick={() => setEslabon(e)}
              className={cn(
                'press min-h-11 rounded-xl px-3 text-[15px] transition-[transform,background-color,box-shadow,color] duration-(--dur-fast) ease-out-strong',
                selected ? 'bg-white font-medium text-soi-ink shadow-raised' : 'bg-white/60 text-soi-ink/80 shadow-ring hover:bg-white hover:text-soi-ink',
              )}
            >
              {ESLABON_LABEL[e]}
            </button>
          );
        })}
      </div>

      <ul id="principio-agents" role="tabpanel" aria-labelledby={`tab-${eslabon}`} className="flex flex-wrap gap-2">
        {AGENTS_BY_ESLABON[eslabon].map((id) => (
          <li key={id}>
            <Link
              href={agentHref(id)}
              className="press tap-target inline-flex h-9 items-center rounded-lg bg-white px-3 text-sm text-soi-ink shadow-ring hover:shadow-soft"
            >
              {AGENTS[id].label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
