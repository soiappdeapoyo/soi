'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import type { PostView } from '@/lib/social/posts';
import { PostCard } from './post-card';
import { Composer } from './composer';

type Cursor = { kind: 'offset'; offset: number } | { kind: 'before'; before: string } | null;

/**
 * Lista del feed. "Cargar más" en lugar de scroll infinito: Impulso inspira para actuar, no para quedarse
 * (CLAUDE.md · Momentum: no se optimiza tiempo en pantalla). Las nuevas publicaciones propias aparecen arriba al instante.
 */
export function FeedList({ initial, cursor: initialCursor, query, me, composer = true, empty, initialMoment = null }: {
  initial: PostView[]; cursor: Cursor; query: string; me: { name: string; avatarUrl: string | null }; composer?: boolean; empty?: React.ReactNode;
  initialMoment?: { id: string; title: string } | null;
}) {
  const [posts, setPosts] = useState(initial);
  const [cursor, setCursor] = useState<Cursor>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [quoting, setQuoting] = useState<PostView | null>(null);

  async function more() {
    if (!cursor) return;
    setLoading(true);
    const qs = new URLSearchParams(query);
    if (cursor.kind === 'offset') qs.set('offset', String(cursor.offset)); else qs.set('antes', cursor.before);
    const res = await fetch(`/api/feed?${qs}`);
    const json = await res.json().catch(() => null);
    setLoading(false);
    if (!json) return;
    const seen = new Set(posts.map((p) => p.id));
    const fresh = (json.posts as PostView[]).filter((p) => !seen.has(p.id));
    setPosts((ps) => [...ps, ...fresh]);
    setCursor(cursor.kind === 'offset' ? (json.more ? { kind: 'offset', offset: cursor.offset + json.posts.length } : null) : json.next ? { kind: 'before', before: json.next } : null);
  }

  const remove = (id: string) => setPosts((ps) => ps.filter((p) => p.id !== id));

  return (
    <div>
      {composer && <Composer me={me} initialMoment={initialMoment} autoFocus={Boolean(initialMoment)} placeholder={initialMoment ? 'Cuenta cómo te fue con este Moment…' : undefined} onPosted={(p) => setPosts((ps) => [p, ...ps])} />}
      {posts.length ? (
        <ul>
          {posts.map((p) => <li key={`${p.restackedBy?.user_id ?? ''}${p.id}`}><PostCard post={p} onQuote={setQuoting} onDeleted={remove} /></li>)}
        </ul>
      ) : empty}
      {cursor && (
        <div className="py-6 text-center">
          <Button variant="outline" size="sm" onClick={more} disabled={loading}>{loading ? 'Cargando…' : 'Cargar más'}</Button>
        </div>
      )}
      <Dialog open={Boolean(quoting)} onOpenChange={(o) => !o && setQuoting(null)} title="Citar publicación">
        {quoting && <Composer me={me} mode="quote" quote={quoting} autoFocus placeholder="Agrega tu reflexión…"
          onPosted={(p) => { setPosts((ps) => [p, ...ps]); setQuoting(null); }} onCancel={() => setQuoting(null)} />}
      </Dialog>
    </div>
  );
}
