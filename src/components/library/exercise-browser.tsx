'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { KIND_LABEL, type Exercise, type ExerciseKind } from '@/lib/library/exercises';
import { cn } from '@/lib/utils';
import { ExerciseAnimation } from './exercise-animation';

type Item = Omit<Exercise, 'instructions'>;

/** Explorar ejercicios: Calistenia (sin equipo), Gimnasio y Estiramiento, con su animación. */
export function ExerciseBrowser({ initial, initialKind }: { initial: Item[]; initialKind: ExerciseKind }) {
  const [kind, setKind] = useState<ExerciseKind>(initialKind);
  const [q, setQ] = useState('');
  const [items, setItems] = useState(initial);
  const [loading, setLoading] = useState(false);
  const first = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      const res = await fetch(`/api/library/exercises?tipo=${kind}&q=${encodeURIComponent(q.trim())}`);
      const json = await res.json().catch(() => ({ exercises: [] }));
      setItems(json.exercises ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer.current);
  }, [kind, q]);

  return (
    <div>
      <div role="tablist" aria-label="Tipo de ejercicio" className="grid grid-cols-3 gap-1 rounded-[14px] bg-soi-sidebar p-1.5">
        {(Object.keys(KIND_LABEL) as ExerciseKind[]).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}
            className={cn('press h-9 rounded-lg text-sm', kind === k ? 'bg-white font-medium shadow-ring' : 'text-soi-muted')}>{KIND_LABEL[k]}</button>
        ))}
      </div>
      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soi-subtle" aria-hidden="true" />
        <label htmlFor="ex-q" className="sr-only">Buscar ejercicio</label>
        <Input id="ex-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pecho, glúteos, push up…" className="pl-9" />
      </div>
      <ul className={cn('mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3', loading && 'opacity-60')} aria-busy={loading}>
        {items.map((e) => (
          <li key={e.id}>
            <Link href={`/mi-vida/ejercicios/${e.id}`} className="press block">
              <ExerciseAnimation frames={e.frames} name={e.name} className="aspect-square rounded-[14px] shadow-ring" />
              <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">{e.name}</p>
              <p className="truncate text-xs text-soi-muted">{e.muscles.join(', ')} · {e.level}</p>
            </Link>
          </li>
        ))}
      </ul>
      {!items.length && !loading && <p className="py-8 text-center text-sm text-soi-muted">Sin resultados.</p>}
      <p className="mt-4 text-xs text-soi-subtle">Ejercicios de free-exercise-db (dominio público). Si tienes una lesión o condición médica, consulta a un profesional antes de entrenar.</p>
    </div>
  );
}
