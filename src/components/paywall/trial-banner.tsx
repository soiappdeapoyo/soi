import Link from 'next/link';

/** Banner de plan: entra desde arriba (translateY(-8px) + fade, 250 ms). Sin contadores parpadeantes. */
export function TrialBanner({ plan, daysLeft, queriesLeft }: { plan: 'trial' | 'free' | 'soi_plus'; daysLeft: number; queriesLeft: number }) {
  if (plan === 'soi_plus') return null;
  return (
    <div className="flex animate-banner-in flex-wrap items-center justify-between gap-2 bg-soi-tray px-4 py-2 text-sm shadow-[0_1px_0_rgb(0_0_0/0.05)]" role="status">
      <span className="nums">
        {plan === 'trial'
          ? `Prueba gratis: te ${daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`} con todo desbloqueado.`
          : `Plan Free: ${queriesLeft} de 20 consultas disponibles.`}
      </span>
      <Link href="/planes" className="press tap-target rounded-md font-medium underline underline-offset-4">Pasar a SOI+</Link>
    </div>
  );
}
