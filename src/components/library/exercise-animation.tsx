import { cn } from '@/lib/utils';

/**
 * Animación del ejercicio: la foto de inicio y la de final se alternan con un fundido (solo opacidad).
 * Con movimiento reducido se queda en la posición inicial.
 */
export function ExerciseAnimation({ frames, name, className }: { frames: string[]; name: string; className?: string }) {
  const [a, b] = frames;
  return (
    <span className={cn('relative block overflow-hidden bg-white', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a} alt={`${name}: movimiento`} loading="lazy" className="absolute inset-0 h-full w-full object-contain" />
      {b && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={b} alt="" aria-hidden="true" loading="lazy" className="exercise-flip absolute inset-0 h-full w-full object-contain" />
      )}
    </span>
  );
}
