import { cn } from '@/lib/utils';

/**
 * Avatar ilustrado de una persona sintética: inicial sobre un degradado de su color. Nunca una foto realista (son
 * personas ficticias; la etiqueta "IA" lo deja claro donde se ve su ficha).
 */
export function PersonaAvatar({ name, hue, size = 48, ai = false, className }: { name: string; hue: number; size?: number; ai?: boolean; className?: string }) {
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
      {initial}
      {ai && (
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white px-1 text-[9px] font-bold leading-[14px] text-[#008069] shadow-[0_0_0_1px_rgb(0_0_0/0.08)]">IA</span>
      )}
    </span>
  );
}
