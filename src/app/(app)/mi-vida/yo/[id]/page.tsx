import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Check, MessageCircle, RotateCcw, Star } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadIdentityView, type EvidenceKind } from '@/lib/identity/view';
import { IdentityActions } from '@/components/identity/identity-actions';

export const metadata: Metadata = { title: 'Mi Nuevo Yo' };

const KIND: Record<EvidenceKind, { label: string; Icon: typeof Check }> = {
  moment: { label: 'Moment vivido', Icon: Check },
  reflexion: { label: 'Reflexión', Icon: MessageCircle },
  logro: { label: 'Logro', Icon: Star },
  regreso: { label: 'Regreso', Icon: RotateCcw },
};

/** Una identidad: no una gráfica, su historia. Los Moments, reflexiones, logros y regresos que la construyeron. */
export default async function IdentityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const profile = await getProfile(user.id);
  const tz = profile?.timezone ?? 'America/Mexico_City';
  const v = await loadIdentityView(supabase, user.id, profile, tz);
  const it = v.identities.find((x) => x.id === id);
  if (!it) notFound();
  const evidence = v.evidence.filter((e) => e.identityIds.includes(id));
  const caps = [...new Set(evidence.flatMap((e) => e.capacities))];
  const fmt = (iso: string) => new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: tz }).format(new Date(iso));

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:py-8">
      <Link href="/mi-vida?tab=nuevo-yo" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Mi Nuevo Yo</Link>
      <p className="mt-5 text-sm text-soi-muted">Estoy convirtiéndome en</p>
      <h1 className="text-3xl font-semibold tracking-tight">{it.name}</h1>
      {it.description && <p className="mt-1 text-[17px] text-soi-muted">{it.description}</p>}
      <div className="mt-4 rounded-[20px] bg-white p-4 shadow-ring">
        <div className="flex items-baseline justify-between">
          <p className="nums text-lg font-semibold text-soi-accent">Nivel {it.level.level}</p>
          <p className="nums text-xs text-soi-muted">{it.level.current} de {it.level.next} para el nivel {it.level.level + 1}</p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-soi-tray"><div className="h-full origin-left rounded-full bg-soi-accent-fill" style={{ transform: `scaleX(${it.level.progress})` }} /></div>
        <p className="nums mt-2 text-sm text-soi-muted">Basado en {it.evidenceCount} {it.evidenceCount === 1 ? 'evidencia' : 'evidencias'}{caps.length ? ` · ${caps.join(', ')}` : ''}</p>
      </div>
      <div className="mt-3"><IdentityActions id={it.id} name={it.name} description={it.description} /></div>

      <section aria-labelledby="built" className="mt-8">
        <h2 id="built" className="mb-2 text-sm font-medium text-soi-muted">Lo que construyó esta identidad</h2>
        {evidence.length ? (
          <ol className="flex flex-col gap-1.5">
            {evidence.slice(0, 80).map((e) => {
              const k = KIND[e.kind];
              return (
                <li key={e.id} className="flex gap-3 rounded-[14px] bg-white p-3 shadow-ring">
                  <k.Icon className="mt-0.5 h-4 w-4 shrink-0 text-soi-accent" aria-label={k.label} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px]">{e.title}</p>
                    {e.note && <p className="mt-0.5 text-sm italic text-soi-muted">«{e.note}»</p>}
                  </div>
                  <time className="shrink-0 text-xs text-soi-subtle" dateTime={e.at}>{fmt(e.at)}</time>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">Aún no hay evidencias. Vive un Moment que te acerque a ser {it.name.toLowerCase()} y aparecerá aquí.</p>
        )}
      </section>
    </div>
  );
}
