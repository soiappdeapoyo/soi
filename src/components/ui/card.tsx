import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Tarjeta: radio 20 px (p-3 + controles de 8 px) → radios concéntricos. Sombra en vez de borde. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[20px] bg-white p-5 shadow-ring', className)} {...props} />;
}
export function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn('text-lg font-semibold', className)} {...props} />;
}
export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-soi-muted', className)} {...props} />;
}

/** Bandeja que contiene una tarjeta: p-2 + tarjeta 20 px → 28 px (concéntrico). */
export function Tray({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[28px] bg-soi-tray p-2', className)} {...props} />;
}
