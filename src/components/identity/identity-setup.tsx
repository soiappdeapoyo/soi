'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, Plus, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Proposal = { name: string; description: string; capacities: string[] };

/**
 * SOI propone identidades (con tus metas, tu propósito y lo que has vivido) y tú confirmas:
 * aceptar, editar el nombre o descartar. También puedes escribir la tuya.
 */
export function IdentitySetup({ auto, compact = false }: { auto: boolean; compact?: boolean }) {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [own, setOwn] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function propose() {
    setLoading(true);
    const res = await fetch('/api/identities/propose', { method: 'POST' });
    const json = await res.json().catch(() => ({ proposals: [] }));
    setProposals(json.proposals ?? []);
    setLoading(false);
  }
  useEffect(() => { if (auto) void propose(); }, [auto]);

  async function accept(p: Proposal) {
    setBusy(p.name);
    const res = await fetch('/api/identities', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudo guardar.'); return; }
    setProposals((ps) => ps?.filter((x) => x.name !== p.name) ?? null);
    toast(`Estás construyendo: ${p.name}`);
    router.refresh();
  }

  return (
    <section aria-label="Identidades que estás construyendo" className={compact ? '' : 'rounded-[20px] bg-white p-4 shadow-ring'}>
      {!compact && (
        <>
          <p className="text-[15px] font-medium">¿En quién te estás convirtiendo?</p>
          <p className="mt-1 text-sm text-soi-muted">Cada Moment que vivas fortalecerá alguna de estas identidades. SOI las propone con lo que sabe de ti; tú decides.</p>
        </>
      )}
      {loading && <div className="skeleton mt-3 h-24 rounded-[14px]" aria-label="SOI está pensando tus identidades" />}
      {proposals && proposals.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {proposals.map((p, n) => (
            <li key={`${p.name}-${n}`} className="rounded-[14px] bg-soi-sidebar p-3">
              <label className="sr-only" htmlFor={`idp-${n}`}>Nombre de la identidad</label>
              <Input id={`idp-${n}`} value={p.name} maxLength={60} className="font-medium"
                onChange={(e) => setProposals((ps) => ps!.map((x, i) => (i === n ? { ...x, name: e.target.value } : x)))} />
              <p className="mt-1.5 text-sm text-soi-muted">{p.description}</p>
              {p.capacities.length > 0 && <p className="mt-1 text-xs text-soi-subtle">Capacidades: {p.capacities.join(', ')}</p>}
              <div className="mt-2 flex gap-2">
                <Button size="sm" onClick={() => accept(p)} disabled={busy === p.name || p.name.trim().length < 2}><Check className="h-4 w-4" aria-hidden="true" /> Es mía</Button>
                <Button size="sm" variant="ghost" onClick={() => setProposals((ps) => ps!.filter((_, i) => i !== n))}><X className="h-4 w-4" aria-hidden="true" /> No</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (own.trim().length >= 2) { void accept({ name: own.trim(), description: '', capacities: [] }); setOwn(''); } }}>
        <label htmlFor="id-own" className="sr-only">Escribe una identidad</label>
        <Input id="id-own" value={own} onChange={(e) => setOwn(e.target.value)} maxLength={60} placeholder="Escribe la tuya: «Padre presente»" className="flex-1" />
        <Button size="sm" type="submit" variant="outline" disabled={own.trim().length < 2}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar</Button>
      </form>
      {!auto && !proposals && (
        <button type="button" onClick={propose} className="press mt-2 inline-flex items-center gap-1.5 text-sm text-soi-accent"><Sparkles className="h-4 w-4" aria-hidden="true" /> Que SOI me proponga</button>
      )}
    </section>
  );
}
