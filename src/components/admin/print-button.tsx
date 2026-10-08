'use client';

import { Button } from '@/components/ui/button';

export function PrintButton({ label = 'Imprimir' }: { label?: string }) {
  return <Button size="sm" onClick={() => window.print()} className="print:hidden">{label}</Button>;
}
