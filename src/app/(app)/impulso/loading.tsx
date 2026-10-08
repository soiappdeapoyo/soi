export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 pb-6 pt-4 sm:px-5 md:pt-8" aria-busy="true" aria-label="Cargando Impulso">
      <div className="flex items-center gap-2"><div className="skeleton h-9 w-24 rounded-full" /><div className="skeleton h-9 w-28 rounded-full" /></div>
      <div className="skeleton mt-4 h-20 rounded-[20px]" />
      <div className="mt-5 flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="skeleton h-10 w-10 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2"><div className="skeleton h-4 w-1/3 rounded" /><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-4 w-4/5 rounded" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
