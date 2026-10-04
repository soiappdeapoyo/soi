'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Layers, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { MOMENT_KINDS, type MomentKind } from '@/config/actions';
import { compressImage, uploadMedia } from '@/lib/media/upload';
import type { PostView } from '@/lib/social/posts';
import { Avatar } from './avatar';
import { cn } from '@/lib/utils';

type Attachable = { id: string; title: string; kind: MomentKind; required_minutes: number; status: string };
type Img = { path: string; preview: string };

type Props = {
  me: { name: string; avatarUrl: string | null };
  mode?: 'post' | 'reply' | 'quote';
  parentId?: string;
  quote?: PostView | null;
  placeholder?: string;
  initialMoment?: { id: string; title: string } | null;
  autoFocus?: boolean;
  onPosted?: (p: PostView) => void;
  onCancel?: () => void;
};

const MAX = 3000;

/**
 * Compositor de Impulso: texto + hasta 4 imágenes + un Moment como componente.
 * Las imágenes se comprimen en el navegador y se suben a tu carpeta; el servidor las modera antes de publicar.
 */
export function Composer({ me, mode = 'post', parentId, quote, placeholder, initialMoment = null, autoFocus, onPosted, onCancel }: Props) {
  const [text, setText] = useState('');
  const [images, setImages] = useState<Img[]>([]);
  const [moment, setMoment] = useState<{ id: string; title: string } | null>(initialMoment);
  const [picker, setPicker] = useState(false);
  const [options, setOptions] = useState<{ own: Attachable[]; official: Attachable[]; published: Attachable[] } | null>(null);
  const [uploading, setUploading] = useState(0);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 360)}px`;
  }, [text]);
  useEffect(() => { if (autoFocus) ref.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    if (!picker || options) return;
    fetch('/api/moments-flow').then((r) => r.json()).then(setOptions).catch(() => setOptions({ own: [], official: [], published: [] }));
  }, [picker, options]);

  async function addImages(files: FileList | null) {
    if (!files) return;
    const room = 4 - images.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) toast('Máximo 4 imágenes por publicación.');
    for (const f of list) {
      setUploading((n) => n + 1);
      try {
        const blob = await compressImage(f);
        const { path } = await uploadMedia('post-media', blob, 'posts');
        setImages((im) => [...im, { path, preview: URL.createObjectURL(blob) }]);
      } catch (e) { toast((e as Error).message); }
      setUploading((n) => n - 1);
    }
  }

  async function publish() {
    setBusy(true);
    const res = await fetch('/api/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: text.trim() || undefined, images: images.map((i) => i.path), moment: moment?.id, parentId, quoteOf: quote?.id }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !json.ok) {
      toast(json.message ?? 'No se pudo publicar.');
      if (json.reason && json.reason !== 'crisis' && images.length) setImages([]); // las imágenes rechazadas se borraron del servidor
      return;
    }
    setText(''); setImages([]); setMoment(null);
    toast(mode === 'reply' ? 'Comentario publicado' : 'Publicado en Impulso');
    onPosted?.(json.post as PostView);
  }

  const canPost = (text.trim().length > 0 || images.length > 0 || Boolean(moment)) && text.length <= MAX && !uploading && !busy;
  const isReply = mode === 'reply';

  return (
    <div className={cn('flex gap-3', !isReply && 'border-b border-black/[0.06] pb-4')}>
      <Avatar url={me.avatarUrl} name={me.name} size={isReply ? 32 : 36} />
      <div className="min-w-0 flex-1">
        <label htmlFor={`composer-${parentId ?? quote?.id ?? 'new'}`} className="sr-only">{isReply ? 'Escribe un comentario' : 'Escribe una publicación'}</label>
        <textarea id={`composer-${parentId ?? quote?.id ?? 'new'}`} ref={ref} value={text} onChange={(e) => setText(e.target.value)} rows={isReply ? 1 : 2}
          placeholder={placeholder ?? (isReply ? 'Escribe un comentario…' : '¿Qué Moment viviste hoy?')}
          className="w-full resize-none bg-transparent py-1.5 text-[15px] leading-relaxed outline-none placeholder:text-soi-subtle" />

        {quote && (
          <div className="mt-1 rounded-[14px] p-3 text-sm shadow-ring">
            <p className="text-xs font-medium">{quote.author.display_name}</p>
            <p className="line-clamp-3 whitespace-pre-wrap text-soi-muted">{quote.body}</p>
          </div>
        )}

        {(images.length > 0 || uploading > 0) && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {images.map((im, i) => (
              <li key={im.path} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={im.preview} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button type="button" onClick={() => setImages((all) => all.filter((_, j) => j !== i))} aria-label="Quitar imagen"
                  className="press absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-soi-ink text-white"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
              </li>
            ))}
            {Array.from({ length: uploading }, (_, i) => <li key={`u${i}`} className="skeleton h-20 w-20 rounded-lg" aria-label="Subiendo imagen" />)}
          </ul>
        )}

        {moment && (
          <p className="mt-2 inline-flex items-center gap-2 rounded-lg bg-soi-accent-soft px-2.5 py-1.5 text-sm text-soi-accent">
            <Layers className="h-4 w-4" aria-hidden="true" /> {moment.title}
            <button type="button" onClick={() => setMoment(null)} aria-label="Quitar Moment" className="press -mr-1 flex h-5 w-5 items-center justify-center rounded"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
          </p>
        )}

        <div className="mt-2 flex items-center gap-1">
          <label className={cn('press tap-target inline-flex h-9 cursor-pointer items-center justify-center rounded-lg px-2 text-soi-muted hover:bg-black/[0.04]', images.length >= 4 && 'pointer-events-none opacity-40')} aria-label="Agregar imágenes">
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void addImages(e.target.files); e.target.value = ''; }} />
          </label>
          {!isReply && (
            <button type="button" onClick={() => setPicker(true)} className="press tap-target inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-soi-muted hover:bg-black/[0.04]" aria-label="Adjuntar un Moment">
              <Layers className="h-5 w-5" aria-hidden="true" /> <span className="hidden sm:inline">Moment</span>
            </button>
          )}
          <span className={cn('nums ml-auto text-xs', text.length > MAX ? 'text-soi-danger' : 'text-soi-subtle')}>{text.length > MAX - 300 ? MAX - text.length : ''}</span>
          {onCancel && <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>}
          <Button size="sm" onClick={publish} disabled={!canPost}>{busy ? 'Publicando…' : isReply ? 'Responder' : 'Publicar'}</Button>
        </div>
      </div>

      <Dialog open={picker} onOpenChange={setPicker} title="Compartir un Moment" description="Se verá como un componente que otras personas pueden comenzar o guardar.">
        {!options ? <div className="skeleton h-40 rounded-[14px]" /> : (
          <div className="flex max-h-[60dvh] flex-col gap-4 overflow-y-auto">
            {([['Mis Moments', options.own], ['Oficiales', options.official], ['Populares', options.published]] as const).map(([label, list]) => list.length > 0 && (
              <section key={label}>
                <h3 className="mb-1.5 text-xs font-medium text-soi-muted">{label}</h3>
                <ul className="flex flex-col gap-1">
                  {list.map((m) => (
                    <li key={m.id}>
                      <button type="button" onClick={() => { setMoment({ id: m.id, title: m.title }); setPicker(false); }}
                        className="press flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-soi-sidebar">
                        <Icon name="Layers" className="h-4 w-4 shrink-0 text-soi-accent" />
                        <span className="min-w-0 flex-1 truncate text-sm">{m.title}</span>
                        <span className="nums shrink-0 text-xs text-soi-muted">{MOMENT_KINDS[m.kind]?.label} · {m.required_minutes} min</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            {options.own.some((m) => m.status === 'private') && <p className="text-xs text-soi-muted">Al compartir un Moment privado, quien vea tu publicación podrá verlo y guardar su versión.</p>}
          </div>
        )}
      </Dialog>
    </div>
  );
}
