'use client';

import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ESLABON_LABEL } from '@/config/agents';
import type { BookSummary as Summary } from '@/lib/library/ai';

/** Resumen del libro como componente de la biblioteca: premisa, 5 ideas clave y una práctica para hoy. */
export function BookSummary({ book, initial }: { book: { key: string; title: string; author: string | null }; initial: Summary | null }) {
  const [summary, setSummary] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setBusy(true); setError(null);
    const res = await fetch('/api/library/books/summary', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(book) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) { setError(json.message ?? 'No se pudo preparar el resumen.'); return; }
    setSummary(json.summary);
  }

  if (!summary) {
    return (
      <div className="rounded-[20px] bg-soi-sidebar p-4">
        <p className="text-sm text-soi-muted">Las ideas clave del libro en 3 minutos, y una práctica para aplicarlo hoy.</p>
        <Button size="sm" className="mt-3" onClick={load} disabled={busy}><Sparkles className="h-4 w-4" aria-hidden="true" /> {busy ? 'Preparando resumen…' : 'Ver resumen'}</Button>
        {error && <p role="alert" className="mt-2 text-sm text-soi-danger">{error}</p>}
      </div>
    );
  }
  return (
    <article className="flex flex-col gap-4">
      <p className="text-[17px] leading-relaxed">{summary.premise}</p>
      <ol className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
        {summary.ideas.map((idea, i) => (
          <li key={i} className="rounded-[14px] bg-white p-3 shadow-ring">
            <p className="text-[15px] font-medium"><span className="nums mr-1.5 text-soi-accent">{i + 1}.</span>{idea.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-soi-muted">{idea.text}</p>
          </li>
        ))}
      </ol>
      <section className="rounded-[20px] bg-soi-accent-soft p-4">
        <p className="text-xs font-medium text-soi-accent">Practícalo hoy · {ESLABON_LABEL[summary.practice.eslabon]}</p>
        <p className="mt-1 font-medium">{summary.practice.title}</p>
        <p className="mt-1 text-sm leading-relaxed">{summary.practice.text}</p>
      </section>
      <p className="text-xs text-soi-subtle">Resumen generado por IA en palabras propias, a partir de la sinopsis de Open Library. No reemplaza leer el libro.</p>
    </article>
  );
}
