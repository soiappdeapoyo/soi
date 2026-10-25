/** Los tres puntos de "escribiendo…", con el rebote suave de WhatsApp (solo transform; quieto con movimiento reducido). */
export function TypingDots() {
  return (
    <div className="mt-1.5 self-start rounded-lg rounded-tl-none bg-white px-3.5 py-3 shadow-[0_1px_0_rgb(0_0_0/0.08)]" aria-hidden="true">
      <span className="flex gap-1">
        {[0, 1, 2].map((d) => <span key={d} className="wa-dot h-2 w-2 rounded-full bg-[#8696A0]" style={{ animationDelay: `${d * 180}ms` }} />)}
      </span>
    </div>
  );
}
