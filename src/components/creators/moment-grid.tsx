import Link from 'next/link';
import { Flag, Lock } from 'lucide-react';
import { Cover } from '@/components/moments/moment-flow-card';
import type { MomentFlow } from '@/lib/moments/types';

/**
 * Cuadrícula de Moments del creador (como las publicaciones de Instagram): 3 columnas, portadas cuadradas,
 * minutos abajo y un ícono arriba si es reto o de pago. El título va en el texto alternativo y al pasar el dedo.
 */
export function MomentGrid({ moments, empty, hrefBase = '/m' }: { moments: MomentFlow[]; empty?: React.ReactNode; /** /b para visitantes sin sesión. */ hrefBase?: '/m' | '/b' }) {
  if (!moments.length) return <>{empty ?? <p className="py-10 text-center text-sm text-soi-muted">Aún no hay Moments aquí.</p>}</>;
  return (
    <ul className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-[14px]">
      {moments.map((m) => (
        <li key={m.id}>
          <Link href={`${hrefBase}/${m.id}`} aria-label={`${m.title} · ${m.required_minutes} min`} className="press group relative block">
            <Cover m={m} className="aspect-square" />
            {!m.cover && <span className="absolute inset-x-1.5 bottom-6 line-clamp-2 text-center text-[11px] font-medium leading-tight text-soi-accent">{m.title}</span>}
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden="true" />
            <span className="nums absolute bottom-1.5 left-2 text-[11px] font-medium text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]" aria-hidden="true">{m.required_minutes} min</span>
            {(m.tier === 'premium' || m.kind === 'challenge') && (
              <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/35 text-white" aria-hidden="true">
                {m.tier === 'premium' ? <Lock className="h-3 w-3" /> : <Flag className="h-3 w-3" />}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
