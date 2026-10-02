'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Analysis = { archetype: string; summary: string; nextStep: string; recurringThemes: string[] };

export function AnalyzeButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true); setError(null);
    const res = await fetch('/api/profile/analyze', { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) { setError(json.message ?? 'No se pudo generar el análisis.'); return; }
    setData(json.analysis);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="gold" onClick={run} disabled={loading}>{loading ? 'Analizando tus patrones…' : 'Generar análisis profundo'}</Button>
      {error && <p role="alert" className="text-sm text-soi-danger">{error}</p>}
      {data && (
        <div className="rounded-2xl bg-soi-gold/10 p-4" aria-live="polite">
          <p className="text-lg font-semibold">{data.archetype}</p>
          <p className="mt-1 text-sm">{data.summary}</p>
          <p className="mt-2 text-sm"><strong>Siguiente paso:</strong> {data.nextStep}</p>
          <p className="mt-2 text-xs text-soi-muted">Lectura orientativa, no es un diagnóstico clínico.</p>
        </div>
      )}
    </div>
  );
}
