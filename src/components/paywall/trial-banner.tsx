import Link from 'next/link';

export function TrialBanner({ plan, daysLeft, queriesLeft }: { plan: 'trial' | 'free' | 'soi_plus'; daysLeft: number; queriesLeft: number }) {
  if (plan === 'soi_plus') return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-soi-gold/30 bg-soi-gold/10 px-4 py-2 text-sm" role="status">
      <span>
        {plan === 'trial'
          ? `Prueba gratis: te ${daysLeft === 1 ? 'queda 1 día' : `quedan ${daysLeft} días`} con todo desbloqueado.`
          : `Plan Free: ${queriesLeft} de 20 consultas disponibles.`}
      </span>
      <Link href="/planes" className="font-semibold underline underline-offset-4">Pasar a SOI+</Link>
    </div>
  );
}
