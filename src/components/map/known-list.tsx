'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, X } from 'lucide-react';
import { toast } from 'sonner';
import { track } from '@/components/providers/analytics';
import { KNOWN_GROUPS, type KnownItem } from '@/lib/self-knowledge';

/**
 * "Lo que SOI sabe de ti": cada dato con su origen y un "Esto no es así" que lo borra de verdad
 * (SOI deja de usarlo). Lo que se cambia en otra pantalla (identidades, enemigos) lleva su enlace.
 */
export function KnownList({ items }: { items: KnownItem[] }) {
  const router = useRouter();
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [, start] = useTransition();

  async function forget(item: KnownItem) {
    if (!item.forget) return;
    setHidden((h) => new Set(h).add(item.key));
    const res = await fetch('/api/memory/forget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.forget) }).catch(() => null);
    if (!res?.ok) {
      setHidden((h) => { const n = new Set(h); n.delete(item.key); return n; });
      toast('No se pudo borrar. Intenta de nuevo.');
      return;
    }
    track('known_forgotten', { kind: item.forget.kind });
    toast('Listo. SOI ya no lo tomará en cuenta.');
    start(() => router.refresh());
  }

  const visible = items.filter((i) => !hidden.has(i.key));
  return (
    <div className="flex flex-col gap-5">
      {KNOWN_GROUPS.map((g) => {
        const list = visible.filter((i) => i.group === g.id);
        return (
          <section key={g.id} aria-labelledby={`k-${g.id}`}>
            <h3 id={`k-${g.id}`} className="px-1 pb-2 text-xs font-medium text-soi-muted">{g.label}</h3>
            {list.length ? (
              <ul className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
                {list.map((i) => (
                  <li key={i.key} className="flex items-start gap-3 rounded-[14px] bg-white px-3 py-3 shadow-ring">
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs text-soi-muted">{i.label}</span>
                      <span className="mt-0.5 block text-[15px] leading-snug">{i.text}</span>
                    </span>
                    {i.forget ? (
                      <button type="button" onClick={() => forget(i)} aria-label={`Esto no es así: borrar «${i.text}»`}
                        className="press tap-target -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : i.href ? (
                      <Link href={i.href} aria-label={`Ver ${i.text}`} className="press tap-target -mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-soi-muted hover:bg-black/[0.04]">
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[14px] bg-soi-sidebar px-3 py-3 text-sm text-soi-muted">{g.empty}</p>
            )}
          </section>
        );
      })}
    </div>
  );
}
