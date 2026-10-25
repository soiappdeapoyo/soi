import { cn } from '@/lib/utils';

/**
 * Avatar de una persona sintética: su foto de perfil (generada con IA o libre de derechos) sobre el degradado con su
 * inicial, que se ve mientras carga o si no tiene foto. La etiqueta "IA" lo deja claro donde se ve su ficha.
 */
export function PersonaAvatar({ name, hue, src, size = 48, ai = false, icon, className }: {
  name: string; hue: number; src?: string | null; size?: number; ai?: boolean; icon?: React.ReactNode; className?: string;
}) {
  const initial = name.trim().charAt(0).toUpperCase() || '·';
  return (
    <span
      aria-hidden="true"
      className={cn('relative inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white', className)}
      style={{
        width: size, height: size, fontSize: Math.round(size * 0.42),
        background: `linear-gradient(135deg, hsl(${hue} 52% 58%), hsl(${(hue + 38) % 360} 48% 38%))`,
      }}
    >
      {icon ?? initial}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" width={size} height={size} loading="lazy" decoding="async" draggable={false}
          className="absolute inset-0 h-full w-full rounded-full object-cover" />
      )}
      {ai && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white px-1 text-[9px] font-bold leading-[14px] text-[#008069] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]">IA</span>
      )}
    </span>
  );
}
