/** Skeletons que respetan la forma final (encabezado, segmentos, tarjeta). Shimmer lento de bajo contraste. */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-3 sm:px-6" aria-busy="true" aria-label="Cargando">
      <div className="skeleton h-5 w-28 rounded-md" />
      <div className="grid grid-cols-2 gap-1 rounded-[14px] bg-soi-tray p-1 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-11 rounded-xl" />)}
      </div>
      <div className="rounded-[28px] bg-soi-tray p-2">
        <div className="skeleton h-80 rounded-[20px]" />
      </div>
    </div>
  );
}
