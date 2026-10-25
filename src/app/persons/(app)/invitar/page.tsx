import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { ArrowLeft, Gift } from 'lucide-react';
import { getPersonsSession } from '@/lib/persons/server';
import { ensureReferralCode, loadReferrals } from '@/lib/persons/referrals';
import { trialDaysLeft } from '@/lib/billing/access-rules';
import { REFERRAL_ACTIVATION_MESSAGES, REFERRAL_FIRST_DAYS, REFERRAL_NEXT_DAYS } from '@/lib/persons/entitlements';
import { InviteShare } from '@/components/persons/invite-share';

export const metadata: Metadata = { title: 'Invita y gana días' };
export const dynamic = 'force-dynamic';

const date = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });

/** Tu link de invitación, cómo se ganan los días y cómo va cada invitación. */
export default async function InvitePage() {
  const s = await getPersonsSession();
  if (typeof s === 'string') redirect('/persons/entrar');
  const [code, refs, h] = await Promise.all([ensureReferralCode(s.userId), loadReferrals(s.userId), headers()]);
  const origin = `${h.get('x-forwarded-proto') ?? 'https'}://${h.get('x-forwarded-host') ?? h.get('host') ?? 'yosoi.app'}`;
  const url = `${origin}/persons/entrar?ref=${code}`;
  const left = trialDaysLeft(s.profile);
  const firstDone = refs.list.some((r) => r.reward_days > 0);

  return (
    <main id="main" className="min-h-dvh bg-[#F0F2F5] md:min-h-[calc(100dvh-2rem)]">
      <header className="flex items-center gap-2 bg-[#008069] px-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <Link href="/persons" aria-label="Volver a los chats" className="press flex h-11 w-11 items-center justify-center rounded-full"><ArrowLeft className="h-6 w-6" aria-hidden="true" /></Link>
        <h1 className="text-lg font-semibold">Invita y gana días</h1>
      </header>
      <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
        <section className="rounded-2xl bg-white p-5 shadow-soft">
          <p className="flex items-center gap-2 text-lg font-semibold"><Gift className="h-5 w-5 text-[#008069]" aria-hidden="true" />
            {firstDone ? `Gana ${REFERRAL_NEXT_DAYS} días por cada persona más` : `Gana ${REFERRAL_FIRST_DAYS} días más de prueba`}
          </p>
          <p className="mt-1.5 text-soi-muted">
            {s.plan === 'soi_plus' ? 'Ya tienes Plus; igual puedes invitar a quien quiera practicar.'
              : s.plan === 'trial' ? `Tu prueba termina en ${left === 1 ? '1 día' : `${left} días`}. Los días que ganes se suman.`
              : 'Tu prueba terminó. Con una invitación vuelves a tener todo desbloqueado.'}
          </p>
          <ol className="mt-4 flex flex-col gap-2 text-[15px]">
            <li><span className="font-medium">1.</span> Comparte tu link con alguien que quiera practicar.</li>
            <li><span className="font-medium">2.</span> Se registra con su cuenta de Google y empieza a platicar ({REFERRAL_ACTIVATION_MESSAGES} mensajes).</li>
            <li><span className="font-medium">3.</span> Ganas {REFERRAL_FIRST_DAYS} días con la primera persona y {REFERRAL_NEXT_DAYS} días con cada persona después.</li>
          </ol>
          <div className="mt-5"><InviteShare url={url} /></div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-soft" aria-labelledby="inv-list">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="inv-list" className="font-semibold">Tus invitaciones</h2>
            {refs.days > 0 && <p className="nums text-sm font-medium text-[#117A3E]">+{refs.days} días ganados</p>}
          </div>
          {!refs.list.length ? <p className="mt-2 text-sm text-soi-muted">Aún nadie se ha registrado con tu link.</p> : (
            <ul className="mt-3 flex flex-col divide-y divide-black/[0.06]">
              {refs.list.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[15px]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{r.name ?? 'Alguien'}</span>
                    <span className="block text-sm text-soi-muted">{r.activated_at ? `Empezó a practicar el ${date(r.activated_at)}` : `Se registró el ${date(r.created_at)} · aún no practica`}</span>
                  </span>
                  <span className={`nums shrink-0 text-sm font-semibold ${r.reward_days > 0 ? 'text-[#117A3E]' : 'text-soi-muted'}`}>
                    {r.reward_days > 0 ? `+${r.reward_days} días` : r.activated_at ? '—' : 'Pendiente'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="px-1 text-xs text-soi-muted">Solo cuentan cuentas nuevas que se registran desde tu link y empiezan a practicar. Máximo 30 invitaciones con premio.</p>
      </div>
    </main>
  );
}
