'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, Plus, X } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Avatar } from '@/components/feed/avatar';
import { compressImage, uploadMedia } from '@/lib/media/upload';
import { MAX_PROFILE_LINKS, type ProfileLink } from '@/lib/social/profile-links';

type Props = { name: string; bio: string | null; avatarUrl: string | null; links: ProfileLink[]; isCreator: boolean };

/** "Editar perfil" (Substack / Instagram): foto, nombre, biografía y enlaces (creadores). */
export function EditProfileButton(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(props.name);
  const [bio, setBio] = useState(props.bio ?? '');
  const [links, setLinks] = useState<ProfileLink[]>(props.links);
  const [preview, setPreview] = useState<string | null>(props.avatarUrl);
  const [avatarPath, setAvatarPath] = useState<string | undefined>();
  const [busy, setBusy] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy('uploading');
    try {
      const blob = await compressImage(file, 600, 0.85);
      const { path, publicUrl } = await uploadMedia('post-media', blob, 'avatar');
      setAvatarPath(path);
      setPreview(publicUrl);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'No se pudo subir la foto.');
    } finally {
      setBusy('idle');
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy('saving');
    const res = await fetch('/api/profile/public', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: name, bio, links: links.filter((l) => l.url.trim()), avatarPath }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy('idle');
    if (!res.ok || !json.ok) { toast(json.message ?? 'No se pudo guardar.'); return; }
    toast('Perfil actualizado');
    setOpen(false);
    setAvatarPath(undefined);
    router.refresh();
  }

  const setLink = (i: number, patch: Partial<ProfileLink>) => setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Editar perfil</Button>
      <Dialog open={open} onOpenChange={setOpen} title="Editar perfil">
        <form onSubmit={save} className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex items-center gap-3">
            <Avatar url={preview} name={name || 'Tú'} size={64} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy !== 'idle'}
              className="press inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm shadow-ring disabled:opacity-60">
              <Camera className="h-4 w-4" aria-hidden="true" /> {busy === 'uploading' ? 'Subiendo…' : 'Cambiar foto'}
            </button>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Elegir foto de perfil"
              onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          <div><Label htmlFor="ep-name">Nombre</Label><Input id="ep-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required /></div>
          <div>
            <Label htmlFor="ep-bio">Biografía</Label>
            <Textarea id="ep-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={200} rows={3} placeholder="Qué estás construyendo en tu vida ahora" />
            <p className="nums mt-1 text-right text-xs text-soi-subtle">{bio.length}/200</p>
          </div>
          <fieldset>
            <legend className="text-sm font-medium">Enlaces</legend>
            {props.isCreator ? (
              <>
                <ul className="mt-2 flex flex-col gap-2">
                  {links.map((l, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="grid flex-1 gap-1.5">
                        <Input aria-label={`Enlace ${i + 1}: dirección`} value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} placeholder="tusitio.com" inputMode="url" maxLength={300} />
                        <Input aria-label={`Enlace ${i + 1}: título (opcional)`} value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} placeholder="Título (opcional)" maxLength={40} />
                      </div>
                      <button type="button" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))} aria-label={`Quitar enlace ${i + 1}`}
                        className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-soi-muted hover:bg-black/[0.04]"><X className="h-4 w-4" aria-hidden="true" /></button>
                    </li>
                  ))}
                </ul>
                {links.length < MAX_PROFILE_LINKS && (
                  <button type="button" onClick={() => setLinks((ls) => [...ls, { label: '', url: '' }])}
                    className="press mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-sm text-soi-accent hover:bg-black/[0.04]">
                    <Plus className="h-4 w-4" aria-hidden="true" /> Agregar enlace
                  </button>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm text-soi-muted">
                Los enlaces son para creadores. <Link href="/creadores" className="text-soi-accent underline underline-offset-4">Activa tu Estudio de creador</Link>.
              </p>
            )}
          </fieldset>
          <div className="sticky bottom-0 flex justify-end gap-2 bg-white pt-2">
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" type="submit" disabled={busy !== 'idle'}>{busy === 'saving' ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
