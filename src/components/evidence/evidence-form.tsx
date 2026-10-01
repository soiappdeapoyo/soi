'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label, Select } from '@/components/ui/input';
import { track } from '@/components/providers/analytics';

export function EvidenceForm({ defaultTitle = '' }: { defaultTitle?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState('');
  const [eslabon, setEslabon] = useState('resultado');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null);
    const res = await fetch('/api/evidence', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content, eslabon, tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5) }),
    });
    setSaving(false);
    if (!res.ok) { setError('No se pudo guardar. Revisa los campos.'); return; }
    const { milestone } = (await res.json()) as { milestone: number | null };
    track('evidence_saved', { eslabon, milestone });
    router.push(milestone ? `/evidencias?hito=${milestone}` : '/evidencias');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="ev-title">¿Qué pasó?</Label>
        <Input id="ev-title" required minLength={3} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. Terminé mi primera semana de Miracle Morning" />
      </div>
      <div>
        <Label htmlFor="ev-content">Cuéntalo con detalle</Label>
        <Textarea id="ev-content" required minLength={3} maxLength={2000} value={content} onChange={(e) => setContent(e.target.value)} placeholder="¿Qué pensaste, sentiste e hiciste para llegar aquí?" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ev-eslabon">Eslabón SOI</Label>
          <Select id="ev-eslabon" value={eslabon} onChange={(e) => setEslabon(e.target.value)}>
            <option value="pensamiento">Pensamiento</option>
            <option value="emocion">Emoción</option>
            <option value="accion">Acción</option>
            <option value="resultado">Resultado</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="ev-tags">Etiquetas (separadas por coma)</Label>
          <Input id="ev-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="trabajo, salud" />
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-soi-danger">{error}</p>}
      <Button type="submit" variant="gold" size="lg" disabled={saving}>{saving ? 'Guardando…' : 'Guardar evidencia'}</Button>
    </form>
  );
}
