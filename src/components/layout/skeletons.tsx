/** Esqueletos por pestaña: misma forma que la pantalla final, para que el cambio de pestaña se sienta inmediato. */

/** Pestañas de texto subrayadas (como ProfileTabs). */
export function TabsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="-mx-4 mt-6 flex h-11 items-center gap-5 overflow-hidden px-4 shadow-[0_1px_0_rgb(11_11_11/0.08)] sm:-mx-5 sm:px-5" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => <div key={i} className="skeleton h-4 w-16 shrink-0 rounded" />)}
    </div>
  );
}

export function CardListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-[14px] bg-white px-3 py-3 shadow-ring">
          <div className="skeleton h-11 w-11 rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5"><div className="skeleton h-4 w-2/3 rounded" /><div className="skeleton h-3 w-1/3 rounded" /></div>
        </div>
      ))}
    </div>
  );
}
