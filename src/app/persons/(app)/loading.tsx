/** Mientras carga la lista: la misma forma (encabezado verde y filas), sin pantalla en blanco ni salto. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="h-[calc(3.5rem+env(safe-area-inset-top))] bg-[#008069]" />
      <ul>
        {Array.from({ length: 6 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-3 py-2.5">
            <span className="skeleton h-[50px] w-[50px] shrink-0 rounded-full" />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="skeleton h-4 w-1/3 rounded" />
              <span className="skeleton h-3 w-2/3 rounded" />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
