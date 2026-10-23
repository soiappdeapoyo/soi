'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';

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

/** Exportar los datos de la cuenta o borrarla (se confirma escribiendo su correo). */
export function AccountDataActions({ userId, email }: { userId: string; email: string | null }) {
  const router = useRouter();
  async function remove() {
    const typed = window.prompt(`Esto borra la cuenta y todos sus datos, y no se puede deshacer.\n\nEscribe el correo de la cuenta para confirmar:\n${email ?? userId}`);
    if (!typed) return;
    const res = await fetch(`/api/panel/users/${userId}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: typed }) });
    const json = await res.json().catch(() => ({}));
    toast(res.ok ? 'Cuenta borrada' : json.message ?? 'No se pudo borrar.');
    if (res.ok) router.push('/panel/usuarios');
  }
  return (
    <div className="flex flex-wrap gap-2">
      <a href={`/api/panel/users/${userId}/export`} download className={buttonClass('outline', 'sm')}>Exportar datos (JSON)</a>
      <Button size="sm" variant="ghost" className="text-soi-danger" onClick={remove}>Borrar cuenta</Button>
    </div>
  );
}
