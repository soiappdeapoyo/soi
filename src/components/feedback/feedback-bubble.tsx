'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Drawer } from 'vaul';
import { MessageSquareHeart } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label, Textarea } from '@/components/ui/input';
import { useMediaQuery } from '@/hooks/use-media-query';
import { track } from '@/components/providers/analytics';
import { hidesBottomNav } from '@/config/navigation';
import { autoPromptPath, FEEDBACK_MAX, RATINGS, showsFeedbackBubble } from '@/lib/feedback';
import { meaningfulFeedback, TRIAL_REWARD_DAYS, TRIAL_TOTAL_DAYS } from '@/lib/trial-reward';
import { cn } from '@/lib/utils';

type Source = 'bubble' | 'prompt';
type Done = { crisis: boolean; resources?: { name: string; phone: string }[]; reward?: { days: number; total: number } | null };

const TITLE = '¿Cómo te está pareciendo SOI?';
const DESCRIPTION = 'Lo leemos todo. Nos ayuda a mejorar SOI para ti.';
const ASKED_KEY = 'soi:feedback-asked';

/**
 * Burbuja «Tu opinión»: discreta, abajo a la derecha (arriba de la barra en el teléfono). Abre un panel con 4 caritas
 * y dos campos opcionales. Se abre sola una sola vez en la vida de la cuenta, en una pantalla tranquila, cuando ya
 * tiene opinión (`/api/feedback/prompt`). Nunca en el chat ni en un Moment en marcha. Roja para que se vea.
 * `reward`: su prueba terminó; su opinión escrita le regala 7 días más (hasta 28). `?opinion=1` la abre (la campanita).
 */
export function FeedbackBubble({ canAutoPrompt, reward = false }: { canAutoPrompt: boolean; reward?: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
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

  // Desde la campanita («Dar mi opinión»): se abre sola y se limpia la dirección.
  useEffect(() => {
    if (params.get('opinion') !== '1') return;
    setSource('bubble'); setOpen(true); track('feedback_opened', { source: 'notification' });
    const q = new URLSearchParams(params.toString()); q.delete('opinion');
    router.replace(`${pathname}${q.size ? `?${q}` : ''}`, { scroll: false });
  }, [params, pathname, router]);

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
    if (reward && !meaningfulFeedback(liked, disliked)) { setError(`Cuéntanos con unas palabras qué te gusta o qué cambiarías para ganar tus ${TRIAL_REWARD_DAYS} días.`); return; }
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
    setDone({ crisis: Boolean(json?.crisis), resources: json?.resources, reward: json?.reward ?? null });
    if (json?.reward) { track('trial_reward_earned', { total: json.reward.total }); router.refresh(); }
  }

  const body = done ? <Thanks done={done} onClose={() => change(false)} /> : (
    <form onSubmit={send} className="flex flex-col gap-4">
      {reward && (
        <p className="rounded-2xl bg-[#FDECEC] px-3.5 py-3 text-sm text-soi-ink">
          🎁 <strong>Gana {TRIAL_REWARD_DAYS} días más de SOI:</strong> cuéntanos qué te gusta o qué cambiarías. Puedes repetirlo cada vez que termine, hasta juntar {TRIAL_TOTAL_DAYS} días.
        </p>
      )}
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
        className={cn('press fixed right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-[#E5484D] text-white shadow-[0_6px_18px_rgb(229_72_77/0.35)] hover:bg-[#D93D42] md:bottom-6 md:right-6',
          hidesBottomNav(pathname) ? 'bottom-[max(1rem,env(safe-area-inset-bottom))]' : 'bottom-[calc(max(0.75rem,env(safe-area-inset-bottom))+4.25rem)]')}>
        <MessageSquareHeart className="h-[22px] w-[22px]" aria-hidden="true" />
        {reward && <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-soi-gold shadow-[0_0_0_2px_white]" />}
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
      {done.reward && <p className="rounded-2xl bg-soi-accent-soft px-3.5 py-3 font-medium">🎉 Ganaste {done.reward.days} días más de SOI. Llevas {done.reward.total} de {TRIAL_TOTAL_DAYS} días de prueba.</p>}
      <p>Lo leemos todo y nos ayuda a hacer SOI mejor para ti.</p>
      <Button onClick={onClose} className="w-full">Listo</Button>
    </div>
  );
}
