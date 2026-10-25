'use client';

import { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { PERSONS_BRAND } from '@/config/persons';

/** Tu link para invitar: compartir (menú del teléfono) o copiar. */
export function InviteShare({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const text = `Estoy practicando conversaciones en ${PERSONS_BRAND}: chateas con personas creadas con IA que tienen su día y sus emociones, y un coach te dice cómo te fue. Pruébalo:`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No pudimos copiar. Mantén presionado el link para copiarlo.');
    }
  }

  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: PERSONS_BRAND, text, url }); return; } catch { /* lo cerró: nada */ return; }
    }
    void copy();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="select-all rounded-xl bg-soi-tray px-3 py-3 text-[15px] font-medium text-[#111B21] [overflow-wrap:anywhere]">{url}</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={() => void share()} className="bg-[#008069] hover:bg-[#006E5A]"><Share2 className="h-4 w-4" aria-hidden="true" />Compartir</Button>
        <Button type="button" variant="outline" onClick={() => void copy()} aria-live="polite">
          {copied ? <><Check className="h-4 w-4" aria-hidden="true" />Copiado</> : <><Copy className="h-4 w-4" aria-hidden="true" />Copiar link</>}
        </Button>
      </div>
    </div>
  );
}
