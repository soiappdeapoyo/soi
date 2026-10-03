'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Textarea, Label, Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { CommunityPost } from '@/types/database';
import { track } from '@/components/providers/analytics';
import { cn } from '@/lib/utils';

const REACTIONS = [
  { key: 'amen', emoji: '🙏', label: 'Amén' },
  { key: 'fuerza', emoji: '💪', label: 'Fuerza' },
  { key: 'corazon', emoji: '❤️', label: 'Corazón' },
  { key: 'gracias', emoji: '🙌', label: 'Gracias' },
] as const;

const TYPE_LABEL: Record<CommunityPost['type'], string> = {
  evidencia: '⭐ Evidencia', peticion: '🕯️ Petición', testimonio: '💬 Testimonio', pregunta: '❓ Pregunta',
};

type Props = { initialPosts: CommunityPost[]; myReactions: string[] };

export function CommunityFeed({ initialPosts, myReactions }: Props) {
  const [posts, setPosts] = useState(initialPosts);
  const [mine, setMine] = useState(new Set(myReactions));
  const [content, setContent] = useState('');
  const [type, setType] = useState<CommunityPost['type']>('testimonio');
  const [anon, setAnon] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [filter, setFilter] = useState<'all' | CommunityPost['type']>('all');
  const [loadingMore, setLoadingMore] = useState(false);
  // Solo el primer lote entra con fade rápido; el scroll infinito no anima cada tarjeta.
  const [initialIds] = useState(() => new Set(initialPosts.map((p) => p.id)));
  // Reacción recién confirmada → "pop" a 1.15 una sola vez.
  const [popped, setPopped] = useState<string | null>(null);

  async function publish(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true); setMsg(null);
    const res = await fetch('/api/community', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, content, isAnonymous: anon }),
    });
    const json = await res.json();
    setPosting(false);
    if (!res.ok) { setMsg(json.message ?? 'No se pudo publicar.'); return; }
    setPosts((p) => [json.post as CommunityPost, ...p]);
    setContent('');
    toast('Publicado en la comunidad');
    track('community_post', { type, anon });
  }

  async function react(postId: string, reaction: string) {
    const key = `${postId}:${reaction}`;
    const had = mine.has(key);
    setMine((s) => { const n = new Set(s); if (had) n.delete(key); else n.add(key); return n; });
    if (!had) setPopped(key);
    const res = await fetch('/api/community/react', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ postId, reaction }),
    });
    if (res.ok) {
      const { reactions } = await res.json();
      setPosts((p) => p.map((x) => (x.id === postId ? { ...x, reactions } : x)));
    }
  }

  async function loadMore() {
    const last = posts.at(-1);
    if (!last) return;
    setLoadingMore(true);
    const res = await fetch(`/api/community?before=${encodeURIComponent(last.created_at)}`);
    setLoadingMore(false);
    if (res.ok) {
      const { posts: more } = (await res.json()) as { posts: CommunityPost[] };
      setPosts((p) => [...p, ...more]);
    }
  }

  const visible = filter === 'all' ? posts : posts.filter((p) => p.type === filter);

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={publish} className="rounded-[20px] bg-white p-4 shadow-soft">
        <Label htmlFor="cp-content" className="sr-only">Comparte con la comunidad</Label>
        <Textarea id="cp-content" value={content} onChange={(e) => setContent(e.target.value)} minLength={5} maxLength={1000} required
          placeholder="Comparte una evidencia, una petición o una pregunta…" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Label htmlFor="cp-type" className="sr-only">Tipo</Label>
          <Select id="cp-type" value={type} onChange={(e) => setType(e.target.value as CommunityPost['type'])} className="w-auto py-2">
            <option value="testimonio">Testimonio</option>
            <option value="evidencia">Evidencia</option>
            <option value="peticion">Petición</option>
            <option value="pregunta">Pregunta</option>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-4 w-4 accent-soi-accent" /> Publicar de forma anónima
          </label>
          <Button type="submit" variant="gold" size="sm" className="ml-auto" disabled={posting || content.length < 5}>{posting ? 'Publicando…' : 'Publicar'}</Button>
        </div>
        <p className="mt-2 text-xs text-soi-muted">Sin ventas, enlaces externos ni consejos médicos.</p>
        {msg && <p role="alert" className="mt-2 text-sm text-soi-danger">{msg}</p>}
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar publicaciones">
        {(['all', 'evidencia', 'testimonio', 'peticion', 'pregunta'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)} aria-pressed={filter === f}
            className={cn('press tap-target h-9 rounded-lg px-3 text-sm', filter === f ? 'bg-soi-ink text-white' : 'bg-white shadow-ring hover:shadow-soft')}>
            {f === 'all' ? 'Todo' : TYPE_LABEL[f]}
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-3">
        {visible.map((p) => (
          <li key={p.id} className={cn('rounded-[20px] bg-white p-4 shadow-soft', initialIds.has(p.id) && 'animate-enter-fade')}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{p.is_anonymous ? 'Alma anónima' : (p.author_name ?? 'Alguien de SOI')}</span>
              <Badge>{TYPE_LABEL[p.type]}</Badge>
              <time className="ml-auto text-xs text-soi-muted" dateTime={p.created_at}>
                {formatDistanceToNow(new Date(p.created_at), { addSuffix: true, locale: es })}
              </time>
            </div>
            <p className="mt-2 whitespace-pre-wrap">{p.content}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REACTIONS.map((r) => {
                const active = mine.has(`${p.id}:${r.key}`);
                return (
                  <button key={r.key} type="button" onClick={() => react(p.id, r.key)} aria-pressed={active} aria-label={`${r.label} (${p.reactions[r.key] ?? 0})`}
                    onAnimationEnd={() => setPopped(null)}
                    className={cn('press-deep tap-target inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm',
                      active ? 'bg-soi-accent-soft shadow-[0_0_0_1px_rgb(31_78_140/0.35)]' : 'bg-white shadow-ring hover:bg-soi-tray',
                      popped === `${p.id}:${r.key}` && 'animate-pop')}>
                    <span aria-hidden="true">{r.emoji}</span> <span className="nums min-w-[2ch] text-left">{p.reactions[r.key] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      {posts.length >= 20 && (
        <Button variant="secondary" onClick={loadMore} disabled={loadingMore}>{loadingMore ? 'Cargando…' : 'Ver más'}</Button>
      )}
    </div>
  );
}
