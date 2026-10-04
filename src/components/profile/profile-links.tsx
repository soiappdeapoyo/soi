'use client';

import { useState } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { displayLink, type ProfileLink } from '@/lib/social/profile-links';

/** Enlaces como en Instagram: el primero visible y "y N más" abre la lista completa. */
export function ProfileLinks({ links }: { links: ProfileLink[] }) {
  const [open, setOpen] = useState(false);
  const first = links[0];
  if (!first) return null;
  const rel = 'noopener noreferrer nofollow ugc';
  return (
    <div className="mt-2 flex min-w-0 items-center gap-1.5 text-sm">
      <Link2 className="h-4 w-4 shrink-0 text-soi-muted" aria-hidden="true" />
      <a href={first.url} target="_blank" rel={rel} className="truncate font-medium text-soi-accent hover:underline underline-offset-4">
        {first.label || displayLink(first.url)}
      </a>
      {links.length > 1 && (
        <button type="button" onClick={() => setOpen(true)} className="press shrink-0 font-medium text-soi-ink hover:underline underline-offset-4">
          y {links.length - 1} más
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen} title="Enlaces">
        <ul className="flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel={rel} className="press flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-soi-sidebar">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-soi-tray"><Link2 className="h-4 w-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{l.label || displayLink(l.url)}</span>
                  {l.label && <span className="block truncate text-xs text-soi-muted">{displayLink(l.url)}</span>}
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-soi-subtle" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-soi-muted">Estos enlaces te llevan fuera de SOI.</p>
      </Dialog>
    </div>
  );
}
