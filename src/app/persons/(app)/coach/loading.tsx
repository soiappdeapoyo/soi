import { WA } from '@/config/persons';

/** Mientras carga el chat con Ale: su fondo y su encabezado, para que no parpadee en blanco al entrar. */
export default function Loading() {
  return (
    <div className="flex h-dvh flex-col md:h-[calc(100dvh-2rem)]" style={{ background: WA.chatBg }} aria-busy="true" aria-label="Cargando">
      <div className="flex h-[calc(3.75rem+env(safe-area-inset-top))] shrink-0 items-end gap-2.5 px-3 pb-2.5" style={{ background: '#4A3AA8' }}>
        <span className="ml-9 h-10 w-10 rounded-full bg-white/20" />
        <span className="mb-2.5 h-3.5 w-28 rounded bg-white/20" />
      </div>
      <div className="flex-1" />
      <div className="px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5"><div className="mx-auto h-11 max-w-3xl rounded-3xl bg-white" /></div>
    </div>
  );
}
