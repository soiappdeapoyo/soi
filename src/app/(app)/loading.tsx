export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-3 p-6" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-1/2 animate-pulse rounded-full bg-black/10" />
      <div className="h-24 animate-pulse rounded-3xl bg-black/5" />
      <div className="h-24 animate-pulse rounded-3xl bg-black/5" />
    </div>
  );
}
