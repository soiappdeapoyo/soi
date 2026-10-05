/** Mientras SOI prepara el Moment (la primera vez puede generar la meditación o la manifestación con su agente). */
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center gap-5 px-5 text-center" aria-busy="true" role="status">
      <span data-breath-halo aria-hidden="true" className="h-24 w-24 animate-breathe rounded-full bg-soi-accent-soft" style={{ animationDuration: '8s' }} />
      <div>
        <p className="text-lg font-medium">Preparando tu Moment…</p>
        <p className="mt-1 text-sm text-soi-muted">Respira mientras tanto. Si es la primera vez, SOI escribe tu meditación con lo que sabe de ti.</p>
      </div>
    </div>
  );
}
