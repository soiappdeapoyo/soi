'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { blockConfigFor, type GuidedContent, type GuidedKind } from '@/lib/guided';

type Patch = { title?: string; source?: string; config: Record<string, unknown> };

/**
 * "Generar con SOI" (agente personalizado) o "De mi biblioteca" para meditación, afirmaciones y manifestación.
 * Lo generado se guarda en la biblioteca y llena el bloque (texto completo, no solo tiempo).
 */
export function GuidedField({ kind, intention, minutes, onApply }: { kind: GuidedKind; intention: string; minutes: number; onApply: (p: Patch) => void }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [items, setItems] = useState<{ id: string; title: string; metadata: Record<string, unknown> }[] | null>(null);
  useEffect(() => {
    fetch(`/api/library/items?kind=${kind}`).then((r) => r.json()).then((j) => setItems(j.items ?? [])).catch(() => setItems([]));
  }, [kind]);

  async function generate() {
    setBusy(true); setMsg(null);
    const res = await fetch('/api/guided', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, intention: intention.slice(0, 300) || 'Sentirme en calma', minutes }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) { setMsg(json.message ?? 'No se pudo generar.'); return; }
    onApply({ title: json.block.title, source: json.block.source, config: json.block.config });
    setMsg('Listo: escrito para ti y guardado en tu biblioteca.');
  }

  function applyItem(id: string) {
    const it = items?.find((x) => x.id === id);
    if (!it) return;
    const b = blockConfigFor({ kind, content: it.metadata } as GuidedContent, it.id);
    onApply({ title: b.title, source: b.source, config: b.config });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-soi-accent-soft/60 p-2">
      <button type="button" onClick={generate} disabled={busy}
        className="press inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-soi-accent shadow-ring disabled:opacity-60">
        <Sparkles className="h-4 w-4" aria-hidden="true" /> {busy ? 'SOI está escribiendo…' : 'Generar con SOI'}
      </button>
      {items && items.length > 0 && (
        <select aria-label="Usar de mi biblioteca" defaultValue="" onChange={(e) => e.target.value && applyItem(e.target.value)}
          className="h-9 min-w-0 flex-1 rounded-lg bg-white px-2 text-sm shadow-ring">
          <option value="">De mi biblioteca…</option>
          {items.map((it) => <option key={it.id} value={it.id}>{it.title}</option>)}
        </select>
      )}
      {msg && <p role="status" className="w-full text-xs text-soi-muted">{msg}</p>}
    </div>
  );
}
