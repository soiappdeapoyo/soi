export default function Loading() {
  return (
    <div className="mx-auto flex h-[calc(100dvh-9rem-env(safe-area-inset-bottom))] max-w-2xl flex-col md:h-dvh" aria-busy="true" aria-label="Cargando la conversación">
      <div className="flex h-10 shrink-0 items-center justify-center"><div className="skeleton h-3 w-24 rounded" /></div>
      <div className="flex-1 px-4 pt-[min(12vh,6rem)] sm:px-6">
        <div className="flex max-w-[85%] flex-col gap-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-4 w-4/5 rounded" />
          <div className="skeleton h-4 w-2/5 rounded" />
        </div>
        <div className="mt-4 flex gap-2"><div className="skeleton h-9 w-24 rounded-full" /><div className="skeleton h-9 w-28 rounded-full" /></div>
      </div>
      <div className="px-4 pb-3 sm:px-6"><div className="skeleton h-14 rounded-[20px]" /></div>
    </div>
  );
}
