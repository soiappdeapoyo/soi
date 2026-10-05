import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, Layers } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { LibraryItemActions } from '@/components/library/library-item-actions';
import { ListenButton } from '@/components/library/listen-button';
import { buttonClass } from '@/components/ui/button';
import { GUIDED_LABEL, type AffirmationsContent, type GuidedKind, type ManifestationContent, type MeditationContent } from '@/lib/guided';

export const metadata: Metadata = { title: 'Recurso' };

/** Meditación, afirmaciones o manifestación escritas para ti: leer, escuchar y usar en un Moment. */
export default async function RecursoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const { data: it } = await supabase.from('library_items').select('id, kind, title, author, metadata, created_at')
    .eq('id', id).eq('user_id', user.id).in('kind', ['meditation', 'affirmations', 'manifestation']).maybeSingle();
  if (!it) notFound();
  const kind = it.kind as GuidedKind;
  const meta = it.metadata as Record<string, unknown> & { intention?: string };

  let spoken = '';
  let body: React.ReactNode = null;
  if (kind === 'meditation') {
    const m = meta as unknown as MeditationContent;
    spoken = m.script;
    body = <div className="space-y-3">{m.script.split(/\n\s*\n/).map((p, i) => <p key={i} className="text-[17px] leading-relaxed">{p}</p>)}</div>;
  } else if (kind === 'affirmations') {
    const a = meta as unknown as AffirmationsContent;
    spoken = a.affirmations.join('. ');
    body = <ol className="flex flex-col gap-1.5">{a.affirmations.map((x, i) => <li key={i} className="rounded-[14px] bg-white p-3 text-[17px] shadow-ring">«{x}»</li>)}</ol>;
  } else {
    const m = meta as unknown as ManifestationContent;
    spoken = `Lo que vas a manifestar: ${m.desire}. Asúmelo así: ${m.assumption}. Cierra los ojos. ${m.scene} Quédate en esa sensación: ${m.feeling}.`;
    body = (
      <div className="flex flex-col gap-3">
        <p><span className="text-sm text-soi-muted">Lo que vas a manifestar</span><br /><span className="text-lg font-medium">{m.desire}</span></p>
        <p className="text-2xl font-semibold text-soi-accent">«{m.assumption}»</p>
        <div className="rounded-[20px] bg-soi-sidebar p-4"><p className="text-xs font-medium text-soi-muted">La escena (como si ya fuera real)</p><p className="mt-1 text-[17px] leading-relaxed">{m.scene}</p></div>
        <p className="text-sm"><span className="font-medium">Siente:</span> {m.feeling}</p>
        <p className="text-sm"><span className="font-medium">Tu paso de hoy:</span> {m.action}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:py-8">
      <Link href="/mi-vida?tab=biblioteca" className="press inline-flex items-center gap-1 text-sm text-soi-muted hover:text-soi-ink"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Biblioteca</Link>
      <p className="mt-5 text-xs font-medium text-soi-accent">{GUIDED_LABEL[kind]} · escrita para ti</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{it.title as string}</h1>
      {meta.intention && <p className="mt-1 text-sm text-soi-muted">Para: {meta.intention}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ListenButton text={spoken} style="calm" />
        <Link href={`/m/nuevo?recurso=${id}`} className={buttonClass('outline', 'sm')}><Layers className="h-4 w-4" aria-hidden="true" /> Crear un Moment con esto</Link>
        <LibraryItemActions id={id} kind={kind} status="saved" back="/mi-vida?tab=biblioteca" />
      </div>
      <div className="mt-6">{body}</div>
      {it.author && <p className="mt-6 text-xs text-soi-muted">Basado en: {it.author as string}</p>}
    </div>
  );
}
