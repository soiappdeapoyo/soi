'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, buttonClass } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import Markdown from '@/components/chat/markdown';
import type { LegalKind } from '@/lib/legal';

type Props = {
  kind: LegalKind;
  title: string;
  path: string;
  current: { content: string; fileName: string | null; createdAt: string } | null;
};

/** Subir (.docx, .md o .txt), revisar y publicar una versión nueva de un documento legal. */
export function LegalForm({ kind, title, path, current }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState(current?.content ?? '');
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<'reading' | 'saving' | null>(null);
  const dirty = content.trim() !== (current?.content ?? '').trim();

  async function load(file: File) {
    setBusy('reading');
    const form = new FormData();
    form.append('file', file);
    const res = await fetch('/api/panel/legal/convert', { method: 'POST', body: form });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (fileRef.current) fileRef.current.value = '';
    if (!res.ok) { toast(json.message ?? 'No se pudo leer el archivo.'); return; }
    setContent(json.content);
    setFileName(file.name);
    setPreview(true);
    toast('Archivo cargado. Revísalo y publica.');
  }

  async function publish() {
    if (!window.confirm(`¿Publicar esta versión de «${title}»? Se verá en ${path} de inmediato.`)) return;
    setBusy('saving');
    const res = await fetch('/api/panel/legal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, content, fileName }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) { toast(json.message ?? 'No se pudo publicar.'); return; }
    toast(`${title}: versión publicada`);
    setFileName(null);
    router.refresh();
  }

  return (
    <section className="rounded-[20px] bg-white p-5 shadow-ring" aria-labelledby={`legal-${kind}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 id={`legal-${kind}`} className="font-semibold">{title}</h2>
        <a href={path} target="_blank" rel="noreferrer" className="text-sm text-soi-muted underline">{path}</a>
      </div>
      <p className="mt-1 text-sm text-soi-muted">
        {current
          ? <>Publicado el {new Date(current.createdAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}{current.fileName ? <> · {current.fileName}</> : null}</>
          : 'Aún no se ha subido: la página muestra la plantilla base.'}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          ref={fileRef} id={`file-${kind}`} type="file" className="sr-only"
          accept=".docx,.md,.markdown,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void load(f); }}
        />
        <label htmlFor={`file-${kind}`} className={buttonClass('outline', 'sm', busy ? 'pointer-events-none opacity-60' : 'cursor-pointer')}>
          {busy === 'reading' ? 'Leyendo…' : 'Subir archivo'}
        </label>
        <span className="text-xs text-soi-subtle">{fileName ?? 'Word (.docx), Markdown (.md) o texto (.txt)'}</span>
        <div className="ml-auto flex gap-1" role="group" aria-label="Vista">
          <Button size="sm" variant={preview ? 'ghost' : 'secondary'} onClick={() => setPreview(false)} aria-pressed={!preview}>Editar</Button>
          <Button size="sm" variant={preview ? 'secondary' : 'ghost'} onClick={() => setPreview(true)} aria-pressed={preview}>Vista previa</Button>
        </div>
      </div>

      {preview ? (
        <div className="prose prose-sm mt-3 max-h-[480px] max-w-none overflow-y-auto rounded-[14px] bg-soi-sidebar p-4">
          {content.trim() ? <Markdown text={content} /> : <p className="text-soi-muted">Sin contenido.</p>}
        </div>
      ) : (
        <Textarea
          aria-label={`Contenido de ${title} (Markdown)`} value={content} onChange={(e) => setContent(e.target.value)}
          rows={16} className="mt-3 font-mono text-xs" placeholder="# Títulos con #, **negritas**, listas con -"
        />
      )}

      <div className="mt-3 flex items-center gap-3">
        <Button onClick={publish} disabled={!dirty || !content.trim() || busy !== null}>
          {busy === 'saving' ? 'Publicando…' : 'Publicar versión'}
        </Button>
        {dirty && <span className="text-xs text-soi-muted">Cambios sin publicar</span>}
      </div>
    </section>
  );
}
