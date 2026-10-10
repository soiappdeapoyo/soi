'use client';

import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Cta } from '@/components/landing/cta';
import { cn } from '@/lib/utils';

export type LandingOffer = {
  key: 'neville' | 'tracy' | 'hill';
  author: string;
  title: string;
  promise: string;
  when: string;
  cover: string;
  href: string;
};

/** Autor del video de donde viene (`?de=neville` en el enlace del anuncio o de la bio). */
export function authorFromUrl(): LandingOffer['key'] | null {
  try {
    const de = new URLSearchParams(window.location.search).get('de')?.toLowerCase() ?? '';
    return de.startsWith('nev') ? 'neville' : de.startsWith('tra') || de.startsWith('bri') ? 'tracy' : de.startsWith('hil') || de.startsWith('nap') ? 'hill' : null;
  } catch { return null; }
}

/**
 * "¿De quién era el video?": un toque elige el reto de 7 días de ese autor y, al crear la cuenta, empieza el día 1.
 * Si el enlace trae `?de=`, ese autor va primero y se marca como el de su video.
 */
export function AuthorPicker({ offers, where, tone = 'dark' }: { offers: LandingOffer[]; where: string; tone?: 'dark' | 'light' }) {
  const [mine, setMine] = useState<LandingOffer['key'] | null>(null);
  useEffect(() => { setMine(authorFromUrl()); }, []);
  const list = mine ? [...offers].sort((a, b) => Number(b.key === mine) - Number(a.key === mine)) : offers;

  return (
    <ul className="flex flex-col gap-2.5">
      {list.map((o) => (
        <li key={o.key}>
          <Cta href={o.href} where={`${where}:${o.key}`} ariaLabel={`${o.title}: ${o.promise} Empezar gratis`}
            className={cn('press group flex items-center gap-3.5 rounded-[20px] p-2 pr-4',
              tone === 'dark' ? 'bg-white/[0.07] ring-1 ring-white/15 hover:bg-white/[0.11]' : 'bg-white shadow-ring hover:bg-soi-tray',
              mine === o.key && (tone === 'dark' ? 'ring-2 ring-soi-gold' : 'shadow-[0_0_0_2px_var(--color-soi-gold)]'))}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={o.cover} alt="" width={72} height={72} className="h-[72px] w-[72px] shrink-0 rounded-[14px] object-cover" />
            <span className="min-w-0 flex-1">
              <span className={cn('block text-xs font-medium', tone === 'dark' ? 'text-soi-gold' : 'text-soi-accent')}>
                {mine === o.key ? 'El de tu video · ' : ''}{o.author}
              </span>
              <span className="mt-0.5 block text-[17px] font-semibold leading-snug">{o.title}</span>
              <span className={cn('nums mt-0.5 block text-sm', tone === 'dark' ? 'text-white/70' : 'text-soi-muted')}>{o.when}</span>
            </span>
            <ArrowRight className={cn('h-5 w-5 shrink-0 transition-transform duration-[var(--dur-fast)] ease-[var(--ease-out-strong)] group-hover:translate-x-0.5', tone === 'dark' ? 'text-white/70' : 'text-soi-muted')} aria-hidden="true" />
          </Cta>
        </li>
      ))}
    </ul>
  );
}
