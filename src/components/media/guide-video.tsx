/**
 * Short o video de YouTube como guía visual (estiramientos, calentamiento, ejercicios sin animación).
 * Sin sonido y en bucle: la voz de SOI sigue guiando. youtube-nocookie, sin videos relacionados.
 */
export function GuideVideo({ id, title, className }: { id: string; title: string; className?: string }) {
  const src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&controls=0&rel=0&modestbranding=1`;
  return (
    <span className={className ?? 'block aspect-[9/16] w-44 overflow-hidden rounded-[20px] bg-black shadow-ring'}>
      <iframe src={src} title={title} allow="autoplay; encrypted-media; picture-in-picture" loading="lazy" className="h-full w-full" />
    </span>
  );
}
