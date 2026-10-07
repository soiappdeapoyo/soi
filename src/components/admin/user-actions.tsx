'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/** Acciones sobre una cuenta (con confirmación; quedan en la auditoría). */
export function UserActions({ userId }: { userId: string }) {
  const router = useRouter();
  async function run(body: Record<string, unknown>, question: string) {
    if (!window.confirm(question)) return;
    const res = await fetch(`/api/panel/users/${userId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    toast(res.ok ? 'Listo' : json.message ?? 'No se pudo aplicar.');
    if (res.ok) router.refresh();
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="outline" onClick={() => run({ action: 'extend_trial', days: 7 }, '¿Extender la prueba 7 días?')}>Extender prueba 7 días</Button>
      <Button size="sm" variant="outline" onClick={() => run({ action: 'reset_queries' }, '¿Reponer las consultas gratis?')}>Reponer consultas gratis</Button>
      <Button size="sm" variant="outline" onClick={() => run({ action: 'set_plan', plan: 'soi_plus' }, '¿Dar SOI+ sin cobro (cortesía)? No crea una suscripción en Stripe.')}>Dar SOI+ (cortesía)</Button>
      <Button size="sm" variant="ghost" onClick={() => run({ action: 'set_plan', plan: 'free' }, '¿Pasar la cuenta al plan Free?')}>Pasar a Free</Button>
    </div>
  );
}
