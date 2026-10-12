'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { SubscriptionView } from '@/lib/billing/subscription';

type Props = { subscription: SubscriptionView | null; hasCustomer: boolean; timezone: string };

/**
 * Suscripción en Ajustes: cancelar es tan fácil como suscribirse (un botón + confirmar), sin depender del portal
 * de Stripe. Se cancela al final del periodo pagado y se puede deshacer hasta esa fecha. El portal queda para
 * el método de pago y las facturas.
 */
export function SubscriptionSection({ subscription, hasCustomer, timezone }: Props) {
  const [sub, setSub] = useState(subscription);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState<'cancel' | 'resume' | 'portal' | null>(null);
  const date = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: timezone });

  async function change(action: 'cancel' | 'resume') {
    setBusy(action);
    try {
      const res = await fetch('/api/stripe/subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json().catch(() => ({})) as { subscription?: SubscriptionView; error?: string };
      if (!res.ok || !data.subscription) { toast(data.error ?? 'No pudimos actualizar tu suscripción'); return; }
      setSub(data.subscription);
      setConfirm(false);
      toast(action === 'cancel' ? `Listo. Sigues con SOI+ hasta el ${date(data.subscription.periodEnd)}` : 'Listo. Sigues con SOI+');
    } catch {
      toast('Sin conexión. Inténtalo otra vez');
    } finally {
      setBusy(null);
    }
  }

  async function portal() {
    setBusy('portal');
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: string };
      if (res.ok && data.url) { window.location.href = data.url; return; }
      toast(data.error ?? 'No pudimos abrir el portal de pagos');
    } catch {
      toast('Sin conexión. Inténtalo otra vez');
    }
    setBusy(null);
  }

  return (
    <section className="rounded-[20px] bg-white p-5 shadow-soft">
      <h2 className="text-lg font-semibold">Suscripción</h2>
      {sub ? (
        <>
          <p className="mt-1 text-[15px] text-soi-muted">
            SOI+ {sub.interval === 'year' ? 'anual' : sub.interval === 'month' ? 'mensual' : ''} ·{' '}
            {sub.cancelAtPeriodEnd
              ? <>termina el <span className="font-medium text-soi-ink">{date(sub.periodEnd)}</span>. Después pasas a Free; no se borra nada.</>
              : sub.status === 'past_due' || sub.status === 'unpaid'
                ? 'tenemos un problema con tu pago. Revisa tu método de pago.'
                : <>se renueva el {date(sub.periodEnd)}.</>}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {sub.cancelAtPeriodEnd
              ? <Button size="sm" onClick={() => void change('resume')} disabled={busy !== null}>{busy === 'resume' ? 'Un momento…' : 'Seguir con SOI+'}</Button>
              : <Button size="sm" variant="outline" onClick={() => setConfirm(true)} disabled={busy !== null}>Cancelar suscripción</Button>}
            <Button size="sm" variant="ghost" onClick={() => void portal()} disabled={busy !== null}>{busy === 'portal' ? 'Abriendo…' : 'Método de pago y facturas'}</Button>
          </div>
        </>
      ) : hasCustomer ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/planes" className="inline-flex min-h-11 items-center underline">Ver planes SOI+</a>
          <Button size="sm" variant="ghost" onClick={() => void portal()} disabled={busy !== null}>Facturas anteriores</Button>
        </div>
      ) : (
        <a href="/planes" className="mt-3 inline-flex min-h-11 items-center underline">Ver planes SOI+</a>
      )}

      {sub && (
        <Dialog open={confirm} onOpenChange={setConfirm} title="¿Cancelar SOI+?"
          description={`Sigues con todo desbloqueado hasta el ${date(sub.periodEnd)} y no se te vuelve a cobrar. Después pasas al plan Free: tus Moments, tu memoria y tu progreso se quedan.`}>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setConfirm(false)} data-autofocus>Mantener SOI+</Button>
            <Button variant="danger" onClick={() => void change('cancel')} disabled={busy !== null}>{busy === 'cancel' ? 'Cancelando…' : 'Sí, cancelar'}</Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
