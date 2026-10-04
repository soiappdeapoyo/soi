import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { LibraryItemActions } from '@/components/library/library-item-actions';
import { buttonClass } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Documento' };

/** Un PDF propio: se lee dentro de la app (visor del navegador) con una URL firmada de 10 minutos. */
export default async function DocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { data: d } = await supabase.from('library_items').select('id, title, file_path, file_size').eq('id', id).eq('user_id', user.id).eq('kind', 'pdf').maybeSingle();
  if (!d?.file_path) notFound();
  const { data: signed } = await supabase.storage.from('library').createSignedUrl(d.file_path as string, 600);

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-6 sm:px-5 md:py-8">
      <Link href="/mi-vida?tab=biblioteca" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Biblioteca</Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight [text-wrap:balance]">{d.title as string}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a href={`/api/library/items/${id}/file`} target="_blank" rel="noopener" className={buttonClass('outline', 'sm')}><ExternalLink className="h-4 w-4" aria-hidden="true" /> Abrir en pantalla completa</a>
        <LibraryItemActions id={id} kind="pdf" status="saved" back="/mi-vida?tab=biblioteca" />
      </div>
      {signed?.signedUrl
        ? <iframe src={signed.signedUrl} title={d.title as string} className="mt-4 h-[75dvh] w-full rounded-[14px] bg-white shadow-ring" />
        : <p className="mt-4 text-sm text-soi-muted">No pudimos abrir el archivo. Intenta de nuevo.</p>}
    </div>
  );
}
