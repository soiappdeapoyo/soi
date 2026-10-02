import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type LabelHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Campos: anillo de 1 px (sin borde duro), foco con el anillo del sistema (acento). Radio 12 px. */
const field =
  'w-full rounded-xl bg-white px-4 py-3 text-base text-soi-ink shadow-[0_0_0_1px_rgb(0_0_0/0.18)] placeholder:text-soi-subtle ' +
  'transition-[box-shadow] duration-(--dur-fast) ease-out-strong focus:shadow-[0_0_0_2px_var(--color-soi-accent)] focus:outline-none disabled:opacity-60';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...p }, ref) => (
  <input ref={ref} className={cn(field, className)} {...p} />
));
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...p }, ref) => (
  <textarea ref={ref} className={cn(field, 'min-h-24 resize-y', className)} {...p} />
));
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...p }, ref) => (
  <select ref={ref} className={cn(field, 'appearance-none', className)} {...p} />
));
Select.displayName = 'Select';

export function Label({ className, ...p }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn('mb-1 block text-sm font-medium', className)} {...p} />;
}
