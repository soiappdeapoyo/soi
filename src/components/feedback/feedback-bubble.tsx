'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Drawer } from 'vaul';
import { MessageSquareHeart } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { track } from '@/components/providers/analytics';
import { hidesBottomNav } from '@/config/navigation';
import { autoPromptPath, FEEDBACK_MAX, RATINGS, showsFeedbackBubble } from '@/lib/feedback';
import { cn } from '@/lib/utils';

type Source = 'bubble' | 'prompt';
type Done = { crisis: boolean; resources?: { name: string; phone: string }[] };

const TITLE = '¿Cómo te está pareciendo SOI?';
const DESCRIPTION = 'Lo leemos todo. Nos ayuda a mejorar SOI para ti.';
const ASKED_KEY = 'soi:feedback-asked';

/**
 * Burbuja «Tu opinión»: discreta, abajo a la derecha (arriba de la barra en el teléfono). Abre un panel con 4 caritas
 * y dos campos opcionales. Se abre sola una sola vez en la vida de la cuenta, en una pantalla tranquila, cuando ya
 * tiene opinión (`/api/feedback/prompt`). Nunca en el chat ni en un Moment en marcha.
 */
export function FeedbackBubble({ canAutoPrompt }: { canAutoPrompt: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const desktop = useMediaQuery('(min-width: 768px)');
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source>('bubble');
  const [rating, setRating] = useState<number | null>(null);
  const [liked, setLiked] = useState('');
  const [disliked, setDisliked] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  // Una revisión por sesión como mucho; el servidor decide y la anota (no vuelve a abrirse sola).
  useEffect(() => {
    if (!canAutoPrompt || !autoPromptPath(pathname)) return;
    try {
      if (sessionStorage.getItem(ASKED_KEY)) return;
      sessionStorage.setItem(ASKED_KEY, '1');
    } catch { /* sin storage: el servidor igual la anota */ }
    const t = setTimeout(async () => {
      const res = await fetch('/api/feedback/prompt', { method: 'POST' }).catch(() => null);
      const json = await res?.json().catch(() => null);
      if (json?.open) { setSource('prompt'); setOpen(true); track('feedback_opened', { source: 'prompt' }); }
    }, 2500);
    return () => clearTimeout(t);
  }, [canAutoPrompt, pathname]);

  if (!showsFeedbackBubble(pathname)) return null;

  function show() {
    setSource('bubble');
    setOpen(true);
    track('feedback_opened', { source: 'bubble' });
  }

  function change(o: boolean) {
    setOpen(o);
    // Al cerrar después de enviar, el formulario queda listo para otra opinión.
    if (!o && done) setTimeout(() => { setDone(null); setRating(null); setLiked(''); setDisliked(''); }, 250);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!rating && !liked.trim() && !disliked.trim()) { setError('Elige una carita o escribe algo.'); return; }
    setBusy(true);
    setError(null);
    const tab = params.get('tab');
    const res = await fetch('/api/feedback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, liked, disliked, source, path: `${pathname}${tab ? `?tab=${tab}` : ''}` }),
    }).catch(() => null);
    const json = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) { setError(json?.message ?? 'No pudimos enviarlo. Intenta de nuevo.'); return; }
    track('feedback_sent', { source, rating, liked: Boolean(liked.trim()), disliked: Boolean(disliked.trim()) });
    setDone({ crisis: Boolean(json?.crisis), resources: json?.resources });
  }

  const body = done ? <Thanks done={done} onClose={() => change(false)} /> : (
    <form onSubmit={send} className="flex flex-col gap-4">
      <fieldset>
        <legend className="sr-only">{TITLE}</legend>
        <div className="grid grid-cols-4 gap-2">
          {RATINGS.map((r) => (
            <button key={r.value} type="button" aria-pressed={rating === r.value} onClick={() => { setRating(r.value); setError(null); }}
              className={cn('press flex flex-col items-center gap-1 rounded-[14px] py-2.5 text-[11px] leading-tight text-soi-muted',
                rating === r.value ? 'bg-soi-accent-soft text-soi-ink shadow-[0_0_0_2px_var(--color-soi-accent)]' : 'bg-soi-tray')}>
              <span aria-hidden="true" className="text-2xl leading-none">{r.emoji}</span>{r.label}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="fb-liked">¿Qué te gusta?</Label>
        <Textarea id="fb-liked" value={liked} onChange={(e) => setLiked(e.target.value)} rows={2} maxLength={FEEDBACK_MAX} placeholder="Opcional" className="mt-1 text-base" />
      </div>
      <div>
        <Label htmlFor="fb-disliked">¿Qué cambiarías?</Label>
        <Textarea id="fb-disliked" value={disliked} onChange={(e) => setDisliked(e.target.value)} rows={2} maxLength={FEEDBACK_MAX}
          placeholder="Algo que no te gustó, no entendiste o no funcionó" className="mt-1 text-base" />
      </div>
      {error && <p role="alert" className="text-center text-sm text-soi-danger">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy}>{busy ? 'Enviando…' : 'Enviar'}</Button>
    </form>
  );

  return (
    <>
      <button type="button" onClick={show} aria-label="Danos tu opinión sobre SOI"
        className={cn('press fixed right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-soi-muted shadow-[0_0_0_1px_rgb(11_11_11/0.06),0_6px_18px_rgb(11_11_11/0.12)] backdrop-blur hover:text-soi-ink md:bottom-6 md:right-6',
          hidesBottomNav(pathname) ? 'bottom-[max(1rem,env(safe-area-inset-bottom))]' : 'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.25rem)]')}>
        <MessageSquareHeart className="h-5 w-5" aria-hidden="true" />
      </button>
      {desktop ? (
        <Dialog open={open} onOpenChange={change} title={done ? 'Gracias' : TITLE} description={done ? undefined : DESCRIPTION}>{body}</Dialog>
      ) : (
        <Drawer.Root open={open} onOpenChange={change}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-black/30" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-raised outline-none">
              <div aria-hidden="true" className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-black/10" />
              <Drawer.Title className="text-lg font-semibold">{done ? 'Gracias' : TITLE}</Drawer.Title>
              <Drawer.Description className={cn('mt-1 text-sm text-soi-muted', done && 'sr-only')}>{DESCRIPTION}</Drawer.Description>
              <div className="mt-4">{body}</div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </>
  );
}

function Thanks({ done, onClose }: { done: Done; onClose: () => void }) {
  if (done.crisis) {
    return (
      <div className="flex flex-col gap-3 text-[15px]">
        <p>Gracias por contarnos. Lo que escribiste suena importante: si estás pasando por un momento difícil, no tienes que cargarlo en soledad.</p>
        {done.resources?.length ? (
          <ul className="flex flex-col gap-1.5">
            {done.resources.map((r) => (
              <li key={r.phone}><a href={`tel:${r.phone.replace(/[^\d+]/g, '')}`} className="font-medium text-soi-accent underline underline-offset-2">{r.name}: {r.phone}</a></li>
            ))}
          </ul>
        ) : null}
        <Link href="/chat?nueva=1" onClick={onClose} className="font-medium text-soi-ink underline underline-offset-2">Hablar con SOI ahora</Link>
        <Button variant="outline" onClick={onClose} className="mt-1 w-full">Cerrar</Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4 text-[15px]">
      <p>Lo leemos todo y nos ayuda a hacer SOI mejor para ti.</p>
      <Button onClick={onClose} className="w-full">Listo</Button>
    </div>
  );
}
