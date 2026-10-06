'use client';

import { useEffect, useMemo, useState } from 'react';
import { thinkingPhrases } from '@/lib/thinking-phrases';

/**
 * Mientras SOI piensa: un pulso y frases pequeñas en cursiva que rotan (cada 3 s, fundido de opacidad).
 * Si está usando una herramienta, muestra qué hace. El lector de pantalla solo oye "SOI está pensando".
 */
export function Thinking({ text, agent, tool }: { text: string; agent?: string; tool?: string | null }) {
  const phrases = useMemo(() => thinkingPhrases(text, agent, new Date().getHours(), text.length), [text, agent]);
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    const t = setInterval(() => setI((n) => Math.min(n + 1, phrases.length - 1)), 3000);
    return () => clearInterval(t);
  }, [phrases]);
  const shown = tool ?? phrases[i]!;
  return (
    <li className="flex items-center gap-2 py-1" role="status">
      <span className="sr-only">SOI está pensando</span>
      <span aria-hidden="true" className="h-2 w-2 shrink-0 animate-thinking rounded-full bg-soi-accent" />
      <span key={shown} aria-hidden="true" className="animate-enter-fade text-[13px] italic leading-snug text-soi-muted">{shown}</span>
    </li>
  );
}
