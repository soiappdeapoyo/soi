import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center gap-1 rounded-md bg-black/[0.05] px-2 py-0.5 text-xs font-medium text-soi-ink', className)} {...props} />;
}
