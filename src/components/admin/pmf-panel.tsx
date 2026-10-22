'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Check, Copy, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AiReading = { id: string; content: string; provider: string | null; created_at: string };

const when = (iso: string) =>
  new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Mexico_City' }).format(new Date(iso));

const CLAUDE_PREFIX = 'Contexto para Claude Code (repo de SOI): con base en este análisis de product-market fit, propón y aplica los ajustes en la app. Sigue CLAUDE.md y DESIGN.md.\n\n';

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast('Copiado. Pégalo en Claude Code.');
    return true;
  } catch {
    toast('No se pudo copiar. Selecciona el texto y cópialo a mano.');
    return false;
  }
}

function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button size="sm" variant="outline" onClick={async () => { if (await copy(text)) { setDone(true); setTimeout(() => setDone(false), 1800); } }}>
      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {done ? 'Copiado' : label}
    </Button>
  );
}

/** Un análisis en un campo de texto (solo lectura) con su botón de copiar. */
export function AnalysisBox({ id, label, text, rows = 18 }: { id: string; label: string; text: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <CopyButton text={CLAUDE_PREFIX + text} />
      </div>
      <textarea id={id} readOnly value={text} rows={rows}
        className="w-full resize-y rounded-[14px] bg-soi-sidebar p-3 font-mono text-[13px] leading-relaxed text-soi-ink" />
    </div>
  );
}

/** Lectura de la IA sobre el análisis por reglas: se pide con un botón, se guarda y queda en el historial. */
export function AiReadings({ rulesId, rulesText, initial }: { rulesId: string; rulesText: string; initial: AiReading[] }) {
  const [readings, setReadings] = useState(initial);
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shown = readings[current] ?? null;

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/panel/pmf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rulesId }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.analysis) { setError(json.message ?? 'La IA no pudo analizar ahora.'); return; }
      setReadings((r) => [json.analysis as AiReading, ...r]);
      setCurrent(0);
      toast('Análisis de la IA guardado.');
    } catch {
      setError('Sin conexión. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={analyze} disabled={busy} aria-busy={busy}>
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          {busy ? 'La IA está analizando… (hasta 2 min)' : readings.length ? 'Analizar otra vez con IA' : 'Analizar con IA'}
        </Button>
        {shown && <CopyButton text={`${CLAUDE_PREFIX}${rulesText}\n\n---\n\n${shown.content}`} label="Copiar reglas + IA" />}
        {readings.length > 1 && (
          <>
            <label htmlFor="ai-version" className="sr-only">Versión del análisis de la IA</label>
            <select id="ai-version" value={current} onChange={(e) => setCurrent(Number(e.target.value))} className="h-9 rounded-[12px] bg-soi-sidebar px-3 text-sm">
              {readings.map((r, i) => <option key={r.id} value={i}>{when(r.created_at)}{r.provider ? ` · ${r.provider}` : ''}</option>)}
            </select>
          </>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {shown
        ? <AnalysisBox id="pmf-ai" label={`Análisis con IA · ${when(shown.created_at)}${shown.provider ? ` · ${shown.provider}` : ''}`} text={shown.content} rows={22} />
        : !busy && <p className="text-sm text-soi-muted">Aún no hay análisis de la IA para este análisis por reglas.</p>}
    </div>
  );
}
