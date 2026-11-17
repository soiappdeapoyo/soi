'use client';

import { useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { track } from '@/components/providers/analytics';

const IDEAS = ['Más corto', 'Sin escribir', 'Con música', 'Más tranquilo'];

/** «Cambiar algo»: la persona dice qué cambiar y SOI edita ese mismo Moment (nueva versión, no uno nuevo). */
export function ChangeMoment({ title, onSend }: { title: string; onSend: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const send = (what: string) => {
    const t = what.trim();
    if (!t) return;
    track('moment_change_requested', { quick: IDEAS.includes(what) });
    onSend(`Cambia mi Moment «${title}»: ${t}`);
    setOpen(false);
    setText('');
  };

  if (!open) {
    return (
      <button type="button" onClick={() => { setOpen(true); setTimeout(() => input.current?.focus(), 0); }}
        className="press inline-flex h-8 items-center rounded-full px-3 text-sm text-soi-ink shadow-ring">Cambiar algo</button>
    );
  }
  return (
    <div className="mt-1 w-full">
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2 rounded-[14px] bg-white p-1.5 pl-3 shadow-ring">
        <label htmlFor="change-moment" className="sr-only">¿Qué le cambio?</label>
        <input ref={input} id="change-moment" value={text} onChange={(e) => setText(e.target.value)} maxLength={300}
          placeholder="¿Qué le cambio?" className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-soi-subtle" />
        <button type="submit" disabled={!text.trim()} aria-label="Enviar el cambio" className="press flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-soi-ink text-white disabled:opacity-25">
          <ArrowUp className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {IDEAS.map((i) => (
          <button key={i} type="button" onClick={() => send(i)} className="press inline-flex h-7 items-center rounded-full bg-soi-tray px-2.5 text-[13px] text-soi-ink">{i}</button>
        ))}
      </div>
    </div>
  );
}
