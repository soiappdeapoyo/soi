'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Guardar el ejercicio en mi biblioteca y sus instrucciones en español (se traducen y cachean una vez). */
export function ExerciseDetail({ id, savedId, instructions }: { id: string; savedId: string | null; instructions: string[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(savedId);
  const [busy, setBusy] = useState(false);
  const [es, setEs] = useState<{ name: string; instructions: string[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/library/exercises/${id}`).then((r) => r.json()).then((j) => { if (alive) { setEs(j.es ?? null); setLoading(false); } })
      .catch(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  async function toggle() {
    setBusy(true);
    const res = saved
      ? await fetch(`/api/library/items/${saved}`, { method: 'DELETE' })
      : await fetch('/api/library/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'exercise', id }) });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || json.ok === false) { toast('No se pudo actualizar.'); return; }
    setSaved(saved ? null : json.id);
    toast(saved ? 'Quitado de tu biblioteca' : 'Guardado en tu biblioteca');
    router.refresh();
  }

  const steps = es?.instructions ?? instructions;
  return (
    <>
      {es?.name && <p className="-mt-1 text-soi-muted">{es.name}</p>}
      <Button size="sm" variant={saved ? 'secondary' : 'primary'} onClick={toggle} disabled={busy} className="mt-4" aria-pressed={Boolean(saved)}>
        {saved ? <BookmarkCheck className="h-4 w-4" aria-hidden="true" /> : <Bookmark className="h-4 w-4" aria-hidden="true" />}
        {saved ? 'En tu biblioteca' : 'Guardar en mi biblioteca'}
      </Button>
      <section aria-labelledby="how" className="mt-6">
        <h2 id="how" className="mb-2 text-sm font-medium text-soi-muted">Cómo hacerlo{loading && !es ? ' · traduciendo…' : ''}</h2>
        <ol className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5" lang={es ? 'es' : 'en'}>
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-[14px] bg-white p-3 text-[15px] leading-relaxed shadow-ring">
              <span className="nums shrink-0 font-medium text-soi-accent">{i + 1}</span><span>{s}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
