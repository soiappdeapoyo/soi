import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'gold' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

/**
 * Botones SOI (DESIGN.md §4):
 * - `press`: transform/background/box-shadow en 120 ms con --ease-out-strong y :active scale(0.97).
 * - Sombras con anillo de 1 px en lugar de bordes duros.
 * - Radio de control 8 px (rounded-lg) → tarjetas p-4 usan 24 px (concéntrico).
 * - `sm` (36 px) extiende el área táctil a 44 px con ::after (tap-target).
 */
const variants: Record<Variant, string> = {
  primary: 'bg-soi-ink text-white shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-soi-ink/90',
  secondary: 'bg-white text-soi-ink shadow-soft hover:shadow-raised',
  gold: 'bg-soi-gold text-soi-ink shadow-[0_1px_2px_rgb(0_0_0/0.12)] hover:bg-[#C9A42F]',
  outline: 'bg-white text-soi-ink shadow-ring hover:bg-soi-tray',
  ghost: 'text-soi-ink hover:bg-black/[0.04]',
  danger: 'bg-soi-danger text-white hover:bg-[#A63426]',
};
const sizes: Record<Size, string> = {
  sm: 'tap-target h-9 px-3 text-sm',
  md: 'h-11 px-5',
  lg: 'h-12 px-6 text-lg',
  icon: 'h-11 w-11',
};

export const buttonClass = (variant: Variant = 'primary', size: Size = 'md', className?: string) =>
  cn(
    'press inline-flex select-none items-center justify-center gap-2 rounded-lg font-medium disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} {...props} />
  ),
);
Button.displayName = 'Button';
