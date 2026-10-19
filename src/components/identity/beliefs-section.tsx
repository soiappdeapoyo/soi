'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Pencil, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { buttonClass } from '@/components/ui/button';
import { track } from '@/components/providers/analytics';

export type BeliefView = { id: string; old: string; next: string | null; stage: string; days: number; milestone: number; owned: boolean };

/**
 * Creencias que estás cambiando: la vieja (con sus palabras), la nueva que eligió y cuántos días la ha practicado.
 * "Practicar" abre su Moment (se crea la primera vez). Entrenamiento mental, no terapia: nada de diagnósticos.
 */
export function BeliefsSection({ beliefs }: { beliefs: BeliefView[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [adding, setAdding] = useState(false);
  const [old, setOld] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function add() {
    setBusy('add');
    const res = await fetch('/api/beliefs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ belief: old, replacement: next || undefined }) }).catch(() => null);
    setBusy(null);
    if (!res?.ok) { toast('No se pudo guardar. Intenta de nuevo.'); return; }
    track('belief_added', { with_replacement: Boolean(next) });
    setOld(''); setNext(''); setAdding(false);
    start(() => router.refresh());
  }

  async function practice(b: BeliefView) {
    setBusy(b.id);
    const res = await fetch(`/api/beliefs/${b.id}/moment`, { method: 'POST' }).catch(() => null);
    const json = res?.ok ? await res.json().catch(() => null) : null;
    if (!json?.id) { setBusy(null); toast('No se pudo preparar tu práctica. Intenta de nuevo.'); return; }
    track('belief_practice_started', { days: b.days });
    router.push(`/m/${json.id}/play`);
  }

  return (
    <section id="creencias" aria-labelledby="beliefs-h" className="scroll-mt-20">
      <h2 id="beliefs-h" className="text-lg font-semibold tracking-tight">Creencias que estás cambiando</h2>
      <p className="mb-3 mt-1 text-sm text-soi-muted">No eres tus pensamientos. Una creencia nueva se vuelve tuya practicándola, un día a la vez.</p>
      {beliefs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {beliefs.map((b) => <BeliefCard key={b.id} b={b} busy={busy === b.id} onPractice={() => practice(b)} />)}
        </ul>
      )}
      {beliefs.length === 0 && !adding && (
        <p className="rounded-[20px] bg-soi-sidebar p-4 text-[15px] text-soi-muted">
          Cuando en una conversación aparezca un pensamiento que te frena («no soy constante», «eso no es para mí»), SOI lo anotará aquí para que lo entrenes.
        </p>
      )}
      {adding ? (
        <div className="mt-3 rounded-[20px] bg-white p-4 shadow-ring">
          <label className="block">
            <span className="text-sm font-medium">El pensamiento que te frena</span>
            <input value={old} onChange={(e) => setOld(e.target.value.slice(0, 160))} placeholder="Por ejemplo: «no soy constante»"
              className="mt-1.5 h-11 w-full rounded-[12px] bg-soi-canvas px-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
          </label>
          <label className="mt-3 block">
            <span className="text-sm font-medium">Una creencia más útil que puedas creer hoy <span className="font-normal text-soi-muted">(opcional)</span></span>
            <input value={next} onChange={(e) => setNext(e.target.value.slice(0, 160))} placeholder="Por ejemplo: «estoy aprendiendo a volver cuando lo dejo»"
              className="mt-1.5 h-11 w-full rounded-[12px] bg-soi-canvas px-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
          </label>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={add} disabled={busy === 'add' || old.trim().length < 4} className={buttonClass('primary', 'sm')}>{busy === 'add' ? 'Guardando…' : 'Guardar'}</button>
            <button type="button" onClick={() => setAdding(false)} className={buttonClass('ghost', 'sm')}>Cancelar</button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="press mt-3 inline-flex items-center gap-1.5 text-sm text-soi-accent">
          <Plus className="h-4 w-4" aria-hidden="true" /> Anotar un pensamiento que me frena
        </button>
      )}
    </section>
  );
}

function BeliefCard({ b, busy, onPractice }: { b: BeliefView; busy: boolean; onPractice: () => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(b.next ?? '');
  const [saving, setSaving] = useState(false);
  const [gone, setGone] = useState(false);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/beliefs/${b.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ next: text }) }).catch(() => null);
    setSaving(false);
    if (!res?.ok) { toast('No se pudo guardar. Intenta de nuevo.'); return; }
    setEditing(false);
    router.refresh();
  }

  async function forget() {
    setGone(true);
    const res = await fetch('/api/memory/forget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'memory', id: b.id }) }).catch(() => null);
    if (!res?.ok) { setGone(false); toast('No se pudo borrar. Intenta de nuevo.'); return; }
    toast('Listo. SOI ya no la tomará en cuenta.');
    router.refresh();
  }

  if (gone) return null;
  const progress = Math.min(1, b.days / b.milestone);
  return (
    <li className="rounded-[28px] bg-soi-tray p-2">
      <div className="rounded-[20px] bg-white p-4 shadow-ring">
        <div className="flex items-start gap-2">
          <p className="flex-1 text-[15px] text-soi-muted"><span className="line-through decoration-soi-muted/50">«{b.old}»</span></p>
          <button type="button" onClick={forget} aria-label="Esto no es así: borrar esta creencia"
            className="press tap-target -mr-1 -mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        {editing || !b.next ? (
          <div className="mt-2">
            <label htmlFor={`next-${b.id}`} className="text-sm font-medium">{b.next ? 'Tu creencia nueva' : '¿Qué te gustaría creer en su lugar?'}</label>
            <input id={`next-${b.id}`} value={text} onChange={(e) => setText(e.target.value.slice(0, 160))} placeholder="Algo que puedas creer hoy, no lo opuesto absoluto"
              className="mt-1.5 h-11 w-full rounded-[12px] bg-soi-canvas px-3 text-[16px] shadow-ring outline-none focus-visible:ring-2 focus-visible:ring-soi-accent-fill" />
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={save} disabled={saving || text.trim().length < 4} className={buttonClass('primary', 'sm')}>{saving ? 'Guardando…' : 'Guardar'}</button>
              {b.next && <button type="button" onClick={() => { setText(b.next ?? ''); setEditing(false); }} className={buttonClass('ghost', 'sm')}>Cancelar</button>}
            </div>
          </div>
        ) : (
          <div className="mt-1 flex items-start gap-2">
            <p className="flex-1 text-pretty text-[19px] font-medium leading-snug">«{b.next}»</p>
            <button type="button" onClick={() => setEditing(true)} aria-label="Editar tu creencia nueva"
              className="press tap-target -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {b.next && (
          <>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-soi-tray" role="progressbar" aria-label={`${b.days} de ${b.milestone} días de práctica`} aria-valuemin={0} aria-valuemax={b.milestone} aria-valuenow={Math.min(b.days, b.milestone)}>
              <div className="h-full origin-left rounded-full bg-soi-accent-fill" style={{ transform: `scaleX(${progress})` }} />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <span className="nums text-sm text-soi-muted">{b.stage} · {b.days === 0 ? 'aún sin practicar' : `${b.days} ${b.days === 1 ? 'día' : 'días'} de práctica`}</span>
              {!b.owned && (
                <button type="button" onClick={onPractice} disabled={busy} className={buttonClass('outline', 'sm')}>
                  {busy ? 'Preparando…' : <>Practicar · 6 min <ArrowRight className="h-4 w-4" aria-hidden="true" /></>}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </li>
  );
}
