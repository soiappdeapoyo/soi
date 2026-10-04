'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BookOpen, Plus, Search } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { BookResult } from '@/lib/library/openlibrary';

/** Buscar un libro en Open Library y agregarlo a "Quiero leer". */
export function BookSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [books, setBooks] = useState<BookResult[] | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setBooks(null); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/library/books/search?q=${encodeURIComponent(q.trim())}`);
      const json = await res.json().catch(() => ({ books: [] }));
      setBooks(json.books ?? []);
    }, 350);
    return () => clearTimeout(timer.current);
  }, [q]);

  async function add(b: BookResult) {
    setAdding(b.key);
    const res = await fetch('/api/library/items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'book', key: b.key, title: b.title, author: b.author, coverUrl: b.coverUrl, status: 'want' }),
    });
    const json = await res.json().catch(() => ({}));
    setAdding(null);
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudo agregar.'); return; }
    toast(json.existed ? 'Ya estaba en tu biblioteca' : 'Agregado a tu biblioteca');
    setOpen(false); setQ('');
    router.push(`/mi-vida/libros/${json.id}`);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4" aria-hidden="true" /> Libro</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Agregar un libro" description="Busca por título o autor. Portadas de Open Library.">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-soi-subtle" aria-hidden="true" />
          <label htmlFor="book-q" className="sr-only">Buscar libro</label>
          <Input id="book-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Piense y hágase rico" className="pl-9" autoFocus />
        </div>
        <ul className="mt-3 flex max-h-[50dvh] flex-col gap-1 overflow-y-auto" aria-live="polite">
          {books === null ? null : books.length === 0 ? <li className="py-6 text-center text-sm text-soi-muted">Sin resultados.</li> : books.map((b) => (
            <li key={b.key}>
              <button type="button" onClick={() => add(b)} disabled={Boolean(adding)}
                className="press flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-soi-sidebar disabled:opacity-60">
                {b.coverUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={b.coverUrl} alt="" loading="lazy" className="h-16 w-11 shrink-0 rounded-[4px] bg-soi-tray object-cover shadow-ring" />
                  : <span className="flex h-16 w-11 shrink-0 items-center justify-center rounded-[4px] bg-soi-tray text-soi-subtle"><BookOpen className="h-4 w-4" aria-hidden="true" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 block text-sm font-medium">{b.title}</span>
                  <span className="block truncate text-xs text-soi-muted">{[b.author, b.year].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="shrink-0 text-xs text-soi-accent">{adding === b.key ? 'Agregando…' : 'Agregar'}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
    </>
  );
}
