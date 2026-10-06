'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import type { CreatorProfile } from '@/types/database';

const CATEGORIES = ['Coach de hábitos', 'Coach de vida', 'Instructora de meditación', 'Instructor de meditación', 'Profesora de yoga', 'Profesor de yoga', 'Mentora de negocios', 'Mentor de negocios', 'Educación financiera', 'Escritora', 'Escritor', 'Entrenadora', 'Entrenador', 'Respiración consciente'];

const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter((x) => x.length >= 2).slice(0, 10);

/**
 * Cuenta de creador (se suma a tu mismo perfil, como en Instagram). Tu nombre y foto son los de tu perfil.
 * El método, principios y límites solo guían a la IA cuando acompaña a quien vive tus Moments: tu contenido nunca lo genera ni lo cambia la IA.
 */
export function CreatorForm({ initial, suggestedName }: { initial: CreatorProfile | null; suggestedName: string }) {
  const router = useRouter();
  const [handle, setHandle] = useState(initial?.handle ?? '');
  const displayName = suggestedName || initial?.display_name || '';
  const [category, setCategory] = useState(initial?.category ?? '');
  // La bio es la de tu perfil (Editar perfil): un solo perfil.
  const bio = initial?.bio ?? '';
  const [methodology, setMethodology] = useState(initial?.methodology ?? '');
  const [principles, setPrinciples] = useState((initial?.principles ?? []).join('\n'));
  const [boundaries, setBoundaries] = useState((initial?.boundaries ?? []).join('\n'));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch('/api/creators', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ handle, displayName, category: category.trim() || undefined, bio: bio || undefined, methodology: methodology || undefined, principles: lines(principles), boundaries: lines(boundaries) }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(json.message ?? 'No se pudo guardar.'); return; }
    toast(initial ? 'Cuenta de creador actualizada' : 'Tu cuenta de creador está lista');
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[20px] bg-white p-4 shadow-ring">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="cf-handle">Usuario</Label>
          <div className="flex items-center rounded-lg shadow-ring">
            <span className="pl-3 text-sm text-soi-muted" aria-hidden="true">@</span>
            <Input id="cf-handle" value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase())} disabled={Boolean(initial)} required
              pattern="[a-z0-9_]{3,30}" maxLength={30} className="border-0 pl-0.5 shadow-none" aria-describedby="cf-handle-hint" />
          </div>
          <p id="cf-handle-hint" className="mt-1 text-xs text-soi-muted">{initial ? 'No se puede cambiar.' : 'Letras, números y guion bajo.'}</p>
        </div>
        <div>
          <Label htmlFor="cf-cat">Categoría</Label>
          <Input id="cf-cat" list="cf-cat-list" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={40} placeholder="Ej. Coach de hábitos" aria-describedby="cf-cat-hint" />
          <datalist id="cf-cat-list">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
          <p id="cf-cat-hint" className="mt-1 text-xs text-soi-muted">Aparece bajo tu nombre.</p>
        </div>
      </div>
      <div>
        <Label htmlFor="cf-method">Tu método</Label>
        <Textarea id="cf-method" value={methodology} onChange={(e) => setMethodology(e.target.value)} maxLength={3000} rows={4}
          placeholder="Cómo piensas y trabajas. SOI lo usará para aplicar tu método a la vida de cada persona que viva tus Moments." />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="cf-pr">Principios de tu método (uno por línea)</Label>
          <Textarea id="cf-pr" value={principles} onChange={(e) => setPrinciples(e.target.value)} rows={4} />
        </div>
        <div>
          <Label htmlFor="cf-bd">Límites para la IA (uno por línea)</Label>
          <Textarea id="cf-bd" value={boundaries} onChange={(e) => setBoundaries(e.target.value)} rows={4} placeholder="Ej. No recomendar inversiones específicas" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xs text-soi-muted">Tu trabajo es 100% tuyo: en una cuenta de creador SOI no genera contenido con IA. Se ofrece dentro de SOI, sin contacto ni ventas por fuera.</p>
        <Button type="submit" className="ml-auto shrink-0" disabled={busy}>{busy ? 'Guardando…' : initial ? 'Guardar' : 'Activar cuenta de creador'}</Button>
      </div>
      {msg && <p role="alert" className="text-sm text-soi-danger">{msg}</p>}
    </form>
  );
}
