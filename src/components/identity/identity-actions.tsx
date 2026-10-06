'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';

/** Editar nombre y descripción de una identidad, o archivarla (sus evidencias no se pierden). */
export function IdentityActions({ id, name, description }: { id: string; name: string; description: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(name);
  const [d, setD] = useState(description ?? '');
  async function patch(body: Record<string, unknown>, ok: string, back = false) {
    const res = await fetch(`/api/identities/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { toast('No se pudo guardar.'); return; }
    toast(ok);
    setEditing(false);
    if (back) router.push('/mi-vida?tab=nuevo-yo'); else router.refresh();
  }
  return editing ? (
    <div className="flex flex-col gap-2">
      <Input value={n} onChange={(e) => setN(e.target.value)} maxLength={60} aria-label="Nombre" />
      <Textarea value={d} onChange={(e) => setD(e.target.value)} maxLength={240} rows={2} aria-label="Descripción" placeholder="Quién eres cuando ya lo eres" />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => patch({ name: n, description: d }, 'Identidad actualizada')} disabled={n.trim().length < 2}>Guardar</Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
      </div>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Editar</Button>
      <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`¿Archivar «${name}»? Tus evidencias se conservan.`)) void patch({ status: 'archived' }, 'Identidad archivada', true); }}>Archivar</Button>
    </div>
  );
}
