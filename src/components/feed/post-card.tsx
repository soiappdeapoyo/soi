'use client';

import { useCallback, useRef, useState } from 'react';
import { useDismiss } from '@/hooks/use-dismiss';
import { ImageViewer } from '@/components/media/image-viewer';
import { Textarea } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShareToDm } from './share-to-dm';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { BadgeCheck, Bookmark, Heart, MessageCircle, MoreHorizontal, Repeat2, Share, X } from 'lucide-react';
import { MomentFlowCard } from '@/components/moments/moment-flow-card';
import type { PostView } from '@/lib/social/posts';
import { Avatar, shortTime } from './avatar';
import { cn } from '@/lib/utils';

type Props = {
  post: PostView;
  /** En el feed el texto largo se recorta; en el detalle se muestra completo. */
  clamp?: boolean;
  onQuote?: (p: PostView) => void;
  onDeleted?: (id: string) => void;
  /** Comentarios: sin acciones de restack ni Moment grande. */
  variant?: 'feed' | 'reply' | 'detail';
};

/**
 * Tarjeta de publicación estilo Substack Notes.
 * Interacciones de alta frecuencia: feedback instantáneo (press), solo el "me gusta" tiene un pop al confirmarse.
 */
export function PostCard({ post, clamp = true, onQuote, onDeleted, variant = 'feed' }: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.like_count);
  const [saved, setSaved] = useState(post.saved);
  const [restacks, setRestacks] = useState(post.restack_count);
  const [popped, setPopped] = useState(false);
  const [expanded, setExpanded] = useState(!clamp);
  const [menu, setMenu] = useState(false);
  const [restackMenu, setRestackMenu] = useState(false);
  // Edición en línea (solo publicaciones propias).
  const [body, setBody] = useState(post.body);
  const [images, setImages] = useState(post.images);
  const [editedAt, setEditedAt] = useState(post.edited_at);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.body ?? '');
  const [removed, setRemoved] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [dm, setDm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const restackRef = useRef<HTMLDivElement>(null);
  const restackBtn = useRef<HTMLButtonElement>(null);
  useDismiss(menuRef, menu, useCallback(() => setMenu(false), []), menuBtn);
  useDismiss(restackRef, restackMenu, useCallback(() => setRestackMenu(false), []), restackBtn);
  const href = `/p/${post.id}`;
  const long = (body?.length ?? 0) > 420 || (body?.split('\n').length ?? 0) > 7;
  const imageUrl = (path: string) => post.imageUrls[post.images.indexOf(path)] ?? '';

  async function call(path: string, init?: RequestInit) {
    const res = await fetch(path, { method: 'POST', ...init });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) toast(json.message ?? 'No se pudo completar.');
    return res.ok ? json : null;
  }

  async function like() {
    const was = liked;
    setLiked(!was); setLikes((n) => n + (was ? -1 : 1));
    if (!was) setPopped(true);
    const r = await call(`/api/posts/${post.id}/like`);
    if (!r) { setLiked(was); setLikes((n) => n + (was ? 1 : -1)); }
    else setLikes((r.result as { count: number }).count);
  }
  async function save() {
    const was = saved;
    setSaved(!was);
    const r = await call(`/api/posts/${post.id}/save`);
    if (!r) setSaved(was); else toast(!was ? 'Guardado' : 'Quitado de guardados');
  }
  async function restack() {
    setRestackMenu(false);
    const r = await call('/api/posts', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restackOf: post.id }) });
    if (r) { setRestacks((n) => n + (r.restacked ? 1 : -1)); toast(r.restacked ? 'Compartido en tu perfil' : 'Restack deshecho'); }
  }
  async function share() {
    const url = `${window.location.origin}${href}`;
    if (navigator.share) { try { await navigator.share({ url, text: post.body?.slice(0, 120) ?? 'SOI' }); return; } catch { /* cancelado */ } }
    await navigator.clipboard.writeText(url);
    toast('Enlace copiado');
  }
  async function remove() {
    setMenu(false);
    if (!window.confirm('¿Eliminar esta publicación?')) return;
    const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
    if (res.ok) { toast('Publicación eliminada'); onDeleted?.(post.id); if (variant === 'detail') router.push('/impulso'); }
  }
  async function saveEdit() {
    setSavingEdit(true);
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: draft, removeImages: removed }),
    });
    const json = await res.json().catch(() => ({}));
    setSavingEdit(false);
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudo guardar.'); return; }
    setBody(json.body); setImages(json.images); setEditedAt(json.edited_at); setEditing(false); setRemoved([]);
    toast('Publicación actualizada');
  }

  async function report() {
    setMenu(false);
    const reason = window.prompt('¿Por qué reportas esta publicación? (opcional)') ?? '';
    await call(`/api/posts/${post.id}/report`, { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) });
    toast('Gracias. Lo revisaremos.');
  }

  const a = post.author;
  const action = 'press tap-target inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink';

  return (
    <article className={cn('relative', variant !== 'reply' && 'border-b border-black/[0.06] py-4')}>
      {post.restackedBy && (
        <p className="mb-2 flex items-center gap-1.5 pl-11 text-xs text-soi-muted">
          <Repeat2 className="h-3.5 w-3.5" aria-hidden="true" /> {post.restackedBy.display_name} hizo restack
        </p>
      )}
      <div className="flex gap-3">
        <Link href={`/u/${a.user_id}`} className="press shrink-0" aria-label={`Perfil de ${a.display_name}`}><Avatar url={a.avatar_url} name={a.display_name} /></Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm">
            <Link href={`/u/${a.user_id}`} className="truncate font-medium hover:underline">{a.display_name}</Link>
            {a.is_verified && <BadgeCheck className="h-4 w-4 shrink-0 text-soi-accent" aria-label="Creador verificado" />}
            {a.handle && <span className="truncate text-soi-subtle">@{a.handle}</span>}
            <span aria-hidden="true" className="text-soi-subtle">·</span>
            <Link href={href} className="shrink-0 text-soi-subtle hover:underline"><time dateTime={post.created_at}>{shortTime(post.created_at)}</time></Link>
            {editedAt && <span className="shrink-0 text-xs text-soi-subtle" title={`Editado ${new Date(editedAt).toLocaleString('es')}`}>· editado</span>}
            <div className="relative ml-auto">
              <button ref={menuBtn} type="button" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Más opciones"
                className="press flex h-8 w-8 items-center justify-center rounded-lg text-soi-subtle hover:bg-black/[0.04]"><MoreHorizontal className="h-4 w-4" aria-hidden="true" /></button>
              {menu && (
                <div ref={menuRef} role="menu" style={{ '--origin': 'top right' } as React.CSSProperties} data-state="open"
                  className="popover-motion absolute right-0 top-9 z-20 min-w-44 rounded-xl bg-white p-1 shadow-raised">
                  <button role="menuitem" type="button" onClick={() => { setMenu(false); void share(); }} className="press flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-black/[0.04]">Compartir enlace</button>
                  <button role="menuitem" type="button" onClick={() => { setMenu(false); setDm(true); }} className="press flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-black/[0.04]">Enviar por mensaje</button>
                  {post.mine && <button role="menuitem" type="button" onClick={() => { setMenu(false); setDraft(body ?? ''); setEditing(true); }} className="press flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-black/[0.04]">Editar</button>}
                  {post.mine
                    ? <button role="menuitem" type="button" onClick={remove} className="press flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm text-soi-danger hover:bg-black/[0.04]">Eliminar</button>
                    : <button role="menuitem" type="button" onClick={report} className="press flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-black/[0.04]">Reportar</button>}
                </div>
              )}
            </div>
          </div>

          {editing ? (
            <div className="mt-2 flex flex-col gap-2">
              <label htmlFor={`edit-${post.id}`} className="sr-only">Editar publicación</label>
              <Textarea id={`edit-${post.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={3000} autoFocus />
              {images.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {images.map((path) => {
                    const gone = removed.includes(path);
                    return (
                      <li key={path} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imageUrl(path)} alt="" className={cn('h-16 w-16 rounded-lg object-cover', gone && 'opacity-30')} />
                        <button type="button" onClick={() => setRemoved((r) => (gone ? r.filter((x) => x !== path) : [...r, path]))} aria-label={gone ? 'Conservar imagen' : 'Quitar imagen'}
                          className="press absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-soi-ink text-white"><X className="h-3.5 w-3.5" aria-hidden="true" /></button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setRemoved([]); }}>Cancelar</Button>
                <Button size="sm" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'Guardando…' : 'Guardar'}</Button>
              </div>
            </div>
          ) : body && (
            <div className="mt-1">
              <p className={cn('whitespace-pre-wrap break-words text-[15px] leading-relaxed text-soi-ink', !expanded && long && 'line-clamp-6')}>{body}</p>
              {!expanded && long && <button type="button" onClick={() => setExpanded(true)} className="mt-1 text-sm font-medium text-soi-accent">Ver más</button>}
            </div>
          )}

          {!editing && images.length > 0 && <ImageGrid urls={images.map(imageUrl).filter(Boolean)} />}

          {post.moment && variant !== 'reply' && (
            <div className="mt-3">
              <MomentFlowCard m={post.moment} variant="feature" />
            </div>
          )}

          {post.quoted && (
            <Link href={`/p/${post.quoted.id}`} className="press mt-3 block rounded-[14px] p-3 shadow-ring hover:bg-soi-sidebar">
              <p className="flex items-center gap-1.5 text-xs">
                <Avatar url={post.quoted.author.avatar_url} name={post.quoted.author.display_name} size={18} />
                <span className="font-medium">{post.quoted.author.display_name}</span>
                <span className="text-soi-subtle">· {shortTime(post.quoted.created_at)}</span>
              </p>
              {post.quoted.body && <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-sm">{post.quoted.body}</p>}
              {post.quoted.imageUrls[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.quoted.imageUrls[0]} alt="" loading="lazy" className="mt-2 max-h-40 rounded-lg object-cover" />
              )}
            </Link>
          )}

          <div className="-ml-2 mt-2 flex items-center gap-1">
            <Link href={href} className={action} aria-label={`Comentar (${post.reply_count})`}>
              <MessageCircle className="h-[18px] w-[18px]" aria-hidden="true" /><span className="nums min-w-[1ch]">{post.reply_count || ''}</span>
            </Link>
            {variant !== 'reply' && (
              <div className="relative">
                <button ref={restackBtn} type="button" onClick={() => setRestackMenu((m) => !m)} aria-haspopup="menu" aria-expanded={restackMenu} className={action} aria-label={`Restack (${restacks})`}>
                  <Repeat2 className="h-[18px] w-[18px]" aria-hidden="true" /><span className="nums min-w-[1ch]">{restacks || ''}</span>
                </button>
                {restackMenu && (
                  <div ref={restackRef} role="menu" style={{ '--origin': 'bottom left' } as React.CSSProperties} data-state="open"
                    className="popover-motion absolute bottom-10 left-0 z-20 min-w-40 rounded-xl bg-white p-1 shadow-raised">
                    <button role="menuitem" type="button" onClick={restack} className="press flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-black/[0.04]">Restack</button>
                    {onQuote && <button role="menuitem" type="button" onClick={() => { setRestackMenu(false); onQuote(post); }} className="press flex min-h-10 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-black/[0.04]">Citar</button>}
                  </div>
                )}
              </div>
            )}
            <button type="button" onClick={like} aria-pressed={liked} aria-label={`Me gusta (${likes})`} className={cn(action, liked && 'text-rose-600 hover:text-rose-600')}>
              <Heart onAnimationEnd={() => setPopped(false)} className={cn('h-[18px] w-[18px]', liked && 'fill-current', popped && 'animate-pop')} aria-hidden="true" />
              <span className="nums min-w-[1ch]">{likes || ''}</span>
            </button>
            <button type="button" onClick={save} aria-pressed={saved} aria-label={saved ? 'Quitar de guardados' : 'Guardar'} className={cn(action, 'ml-auto', saved && 'text-soi-accent')}>
              <Bookmark className={cn('h-[18px] w-[18px]', saved && 'fill-current')} aria-hidden="true" />
            </button>
            <button type="button" onClick={share} aria-label="Compartir" className={action}><Share className="h-[18px] w-[18px]" aria-hidden="true" /></button>
          </div>
        </div>
      </div>
      <ShareToDm open={dm} onOpenChange={setDm} postId={post.id} />
    </article>
  );
}

/** 1 imagen: completa · 2: dos columnas · 3–4: cuadrícula. Bordes concéntricos con la tarjeta. */
export function ImageGrid({ urls }: { urls: string[] }) {
  const n = urls.length;
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  return (
    <>
      <div className={cn('mt-3 grid gap-1 overflow-hidden rounded-[14px]', n === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
        {urls.map((u, i) => (
          <button key={u} type="button" onClick={(e) => { e.stopPropagation(); setOpen(i); }} aria-label={n > 1 ? `Ver foto ${i + 1} de ${n}` : 'Ver foto'}
            className={cn('block bg-soi-tray', n === 3 && i === 0 && 'row-span-2')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" loading="lazy" className={cn('h-full w-full object-cover', n === 1 ? 'max-h-[28rem]' : 'aspect-square')} />
          </button>
        ))}
      </div>
      <ImageViewer urls={urls} index={open} onClose={close} />
    </>
  );
}
