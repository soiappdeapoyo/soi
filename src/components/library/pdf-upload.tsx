'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { uploadMedia } from '@/lib/media/upload';

const MAX = 30 * 1024 * 1024;

/** Subir un PDF propio (artículos, ebooks). Privado: solo su dueño lo ve. */
export function PdfUpload() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (file.type !== 'application/pdf') { toast('Solo archivos PDF.'); return; }
    if (file.size > MAX) { toast('El PDF supera 30 MB.'); return; }
    setBusy(true);
    try {
      const { path } = await uploadMedia('library', file);
      const title = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim().slice(0, 300) || 'Documento';
      const res = await fetch('/api/library/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'pdf', path, title, size: file.size }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.message ?? 'No se pudo guardar.');
      toast('PDF agregado a tu biblioteca');
      router.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo subir el PDF.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => input.current?.click()} disabled={busy}>
        <Upload className="h-4 w-4" aria-hidden="true" /> {busy ? 'Subiendo…' : 'PDF'}
      </Button>
      <input ref={input} type="file" accept="application/pdf" className="sr-only" aria-label="Elegir PDF"
        onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
    </>
  );
}
