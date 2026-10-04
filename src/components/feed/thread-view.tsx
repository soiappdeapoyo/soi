'use client';

import { useState } from 'react';
import type { PostView } from '@/lib/social/posts';
import { PostCard } from './post-card';
import { Composer } from './composer';

/**
 * Hilo de comentarios (como Substack): comentarios a la publicación y respuestas a cada comentario,
 * con una sola sangría para que siga siendo legible en el móvil.
 */
export function ThreadView({ post, replies: initial, me, canInteract }: {
  post: PostView; replies: PostView[]; me: { name: string; avatarUrl: string | null }; canInteract: boolean;
}) {
  const [replies, setReplies] = useState(initial);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const top = replies.filter((r) => r.parent_id === post.id);
  const childrenOf = (id: string) => replies.filter((r) => r.parent_id === id);
  const remove = (id: string) => setReplies((rs) => rs.filter((r) => r.id !== id && r.parent_id !== id));

  return (
    <div>
      <PostCard post={post} clamp={false} variant="detail" />
      {canInteract && (
        <div className="border-b border-black/[0.06] py-4">
          <Composer me={me} mode="reply" parentId={post.id} placeholder="Escribe un comentario…" onPosted={(p) => setReplies((rs) => [...rs, p])} />
        </div>
      )}
      <h2 className="sr-only">Comentarios</h2>
      <ul className="divide-y divide-black/[0.06]">
        {top.map((c) => (
          <li key={c.id} className="py-3">
            <PostCard post={c} variant="reply" clamp={false} onDeleted={remove} />
            <div className="ml-11 mt-1 flex flex-col gap-2 border-l border-black/[0.06] pl-3">
              {childrenOf(c.id).map((r) => <PostCard key={r.id} post={r} variant="reply" clamp={false} onDeleted={remove} />)}
              {canInteract && (replyTo === c.id ? (
                <Composer me={me} mode="reply" parentId={c.id} autoFocus placeholder={`Responder a ${c.author.display_name}…`}
                  onPosted={(p) => { setReplies((rs) => [...rs, p]); setReplyTo(null); }} onCancel={() => setReplyTo(null)} />
              ) : (
                <button type="button" onClick={() => setReplyTo(c.id)} className="press w-fit rounded-md px-1 text-xs text-soi-muted hover:text-soi-ink">Responder</button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {!top.length && <p className="py-8 text-center text-sm text-soi-muted">Aún no hay comentarios.</p>}
    </div>
  );
}
