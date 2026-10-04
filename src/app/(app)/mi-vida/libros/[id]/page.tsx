import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { BookSummary } from '@/components/library/book-summary';
import { LibraryItemActions } from '@/components/library/library-item-actions';
import type { BookSummary as Summary } from '@/lib/library/ai';

export const metadata: Metadata = { title: 'Libro' };

/** Un libro de mi biblioteca: portada (Open Library), estado de lectura y resumen como componente. */
export default async function LibroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { data: b } = await supabase.from('library_items').select('id, title, author, cover_url, status, external_id').eq('id', id).eq('user_id', user.id).eq('kind', 'book').maybeSingle();
  if (!b) notFound();
  const key = b.external_id as string;
  const { data: cached } = await supabase.from('content_cache').select('value').eq('key', `book:summary:${key}`).maybeSingle();
  const largeCover = (b.cover_url as string | null)?.replace(/-M\.jpg$/, '-L.jpg') ?? null;

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:py-8">
      <Link href="/mi-vida?tab=biblioteca" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Biblioteca</Link>
      <header className="mt-5 flex gap-4">
        {largeCover
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={largeCover} alt={`Portada de ${b.title}`} className="w-28 shrink-0 self-start rounded-[6px] bg-soi-tray object-cover shadow-soft sm:w-36" />
          : <span className="flex aspect-[2/3] w-28 shrink-0 items-center justify-center rounded-[6px] bg-soi-accent-soft text-soi-accent"><BookOpen className="h-6 w-6" aria-hidden="true" /></span>}
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight [text-wrap:balance]">{b.title as string}</h1>
          {b.author && <p className="mt-1 text-soi-muted">{b.author as string}</p>}
          <div className="mt-4"><LibraryItemActions id={id} kind="book" status={b.status as string} back="/mi-vida?tab=biblioteca" /></div>
        </div>
      </header>
      <section aria-labelledby="sum" className="mt-8">
        <h2 id="sum" className="mb-3 text-sm font-medium text-soi-muted">Resumen</h2>
        <BookSummary book={{ key, title: b.title as string, author: (b.author as string | null) ?? null }} initial={(cached?.value as Summary | undefined) ?? null} />
      </section>
      <p className="mt-6 text-xs text-soi-subtle">Datos y portada: <a href={`https://openlibrary.org${key}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Open Library</a>.</p>
    </div>
  );
}
