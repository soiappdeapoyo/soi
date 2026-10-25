'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import type { Described, SpecDiff } from '@/lib/persons/spec';
import type { PersonaPreset } from '@/config/persons-presets';
import { Button } from '@/components/ui/button';
import { PersonaAvatar } from './avatar';

const MAX = 280;
const MIN = 30;
const DIFFICULTY = ['', 'Fácil', 'Media', 'Difícil'];

type Generated = { described: Described; sourceDescription: string; diff: SpecDiff | null };

async function post<T>(url: string, body: unknown, method = 'POST'): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    return res.ok ? { ok: true, data } : { ok: false, error: data.error ?? 'Algo falló. Intenta de nuevo.' };
  } catch {
    return { ok: false, error: 'Sin conexión. Intenta de nuevo.' };
  }
}

function Preview({ d, hue }: { d: Described; hue: number }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-white p-5 text-center shadow-soft">
      <PersonaAvatar name={d.name} hue={hue} size={80} ai />
      <p className="mt-3 text-xl font-semibold">{d.name}, {d.age}</p>
      <p className="text-soi-muted">{d.profession} · {d.city}</p>
      {d.bio && <p className="mt-3 text-[15px] leading-relaxed">{d.bio}</p>}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5">{d.interests.map((i) => <span key={i} className="rounded-full bg-soi-tray px-2.5 py-1 text-sm">{i}</span>)}</div>
      <dl className="mt-4 grid w-full gap-2 text-left text-sm">
        <div><dt className="font-semibold text-soi-muted">Personalidad</dt><dd>{d.traits.join(' · ')}</dd></div>
        <div><dt className="font-semibold text-soi-muted">Límites</dt><dd>{d.boundaries.join(' · ')}</dd></div>
        <div><dt className="font-semibold text-soi-muted">Dificultad</dt><dd>{DIFFICULTY[d.difficulty]}</dd></div>
      </dl>
    </div>
  );
}

/**
 * Crear una persona desde una descripción (o desde un arquetipo listo), o ajustar una existente con un cambio.
 * La IA genera la ficha; se ve antes de guardar (Regenerar · Ajustar · Crear). Nunca escribe primero: empiezas tú.
 */
export function CreatePersona({ presets = [], adjust }: { presets?: PersonaPreset[]; adjust?: { personaId: string; name: string; hue: number; source: string; messages: number } }) {
  const router = useRouter();
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [delta, setDelta] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Generated | null>(null);
  const [tweak, setTweak] = useState('');
  const hue = adjust?.hue ?? 160;

  async function generate(desc: string) {
    setBusy('generate');
    setError(null);
    const r = await post<Generated>('/api/persons/generate', adjust ? { personaId: adjust.personaId, delta: desc } : { description: desc, name: name.trim() || undefined });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    setResult(r.data);
  }

  async function create() {
    if (!result) return;
    setBusy('create');
    const r = adjust
      ? await post<{ id: string; archived?: string }>(`/api/persons/${adjust.personaId}`, { action: 'apply', described: result.described, sourceDescription: result.sourceDescription }, 'PATCH')
      : await post<{ id: string }>('/api/persons', { described: result.described, sourceDescription: result.sourceDescription });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    if (adjust && 'archived' in r.data && r.data.archived) toast.success('Archivamos la conversación anterior y creamos a la persona nueva.');
    router.push(`/persons/${r.data.id}`);
    router.refresh();
  }

  async function addPreset(id: string) {
    setBusy(`preset:${id}`);
    const r = await post<{ id: string }>('/api/persons', { presetId: id });
    setBusy(null);
    if (!r.ok) { setError(r.error); return; }
    router.push(`/persons/${r.data.id}`);
    router.refresh();
  }

  if (result) {
    const diff = result.diff;
    return (
      <div className="flex flex-col gap-4">
        <Preview d={result.described} hue={hue} />
        {diff && (
          <section className="rounded-2xl bg-white p-4 text-sm shadow-soft" aria-labelledby="diff-title">
            <h2 id="diff-title" className="font-semibold">Qué cambia</h2>
            {!diff.changes.length ? <p className="mt-1 text-soi-muted">No hay cambios.</p> : (
              <ul className="mt-2 flex flex-col gap-1.5">
                {diff.changes.map((c) => <li key={c.field}><span className="font-medium">{c.label}:</span> <span className="text-soi-muted line-through">{c.from}</span> → {c.to}</li>)}
              </ul>
            )}
            <p className="mt-3 text-soi-muted">
              {diff.structural
                ? `Cambiar quién es (edad, género, profesión o ciudad) crea a otra persona: la conversación actual (${adjust?.messages ?? 0} mensajes) se archiva, no se borra.`
                : diff.reset === 'trust' ? `Se mantienen el historial, la voz y el nombre. Al cambiar sus límites, la confianza vuelve a empezar.`
                : diff.reset === 'openness' ? 'Se mantienen el historial, la voz y la confianza. Su apertura vuelve a neutral.'
                : 'Se mantienen el historial, la voz y su estado emocional.'}
            </p>
          </section>
        )}
        <div className="rounded-2xl bg-white p-4 shadow-soft">
          <label htmlFor="tweak" className="text-sm font-semibold">¿Algo que ajustar?</label>
          <div className="mt-2 flex gap-2">
            <input id="tweak" value={tweak} onChange={(e) => setTweak(e.target.value)} maxLength={200} placeholder="Ej.: que sea más reservado al inicio"
              className="h-11 min-w-0 flex-1 rounded-lg bg-soi-tray px-3 text-base outline-none" />
            <Button variant="outline" disabled={tweak.trim().length < 4 || busy !== null}
              onClick={() => { const t = tweak.trim(); setTweak(''); void generate(adjust ? `${delta}. ${t}` : `${description}\nAjuste: ${t}`); }}>
              Ajustar
            </Button>
          </div>
        </div>
        {error && <p role="alert" className="text-center text-sm text-soi-danger">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" disabled={busy !== null} onClick={() => void generate(adjust ? delta : description)}>{busy === 'generate' ? 'Generando…' : 'Regenerar'}</Button>
          <Button disabled={busy !== null || (diff !== null && !diff.changes.length)} onClick={() => void create()} className="bg-[#008069] hover:bg-[#006E5A]">
            {busy === 'create' ? 'Guardando…' : adjust ? 'Aplicar' : 'Crear'}
          </Button>
        </div>
        <button type="button" onClick={() => setResult(null)} className="text-sm text-soi-muted underline underline-offset-2">Volver a la descripción</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={(e) => { e.preventDefault(); void generate(adjust ? delta : description); }} className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-soft">
        {adjust ? (
          <>
            <label htmlFor="delta" className="font-semibold">¿Qué quieres cambiar de {adjust.name}?</label>
            <textarea id="delta" value={delta} onChange={(e) => setDelta(e.target.value.slice(0, MAX))} rows={4} placeholder="Ej.: que sea más directa y le guste la fotografía"
              className="resize-none rounded-xl bg-soi-tray p-3 text-base outline-none" />
            <details className="text-sm text-soi-muted"><summary className="cursor-pointer">Cómo la describiste</summary><p className="mt-1 whitespace-pre-wrap">{adjust.source}</p></details>
          </>
        ) : (
          <>
            <label htmlFor="desc" className="font-semibold">Descríbela en tus palabras</label>
            <textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value.slice(0, MAX))} rows={5}
              placeholder="Mujer de 29, diseñadora gráfica en CDMX, le gusta el senderismo y el cine independiente, un poco sarcástica pero amable, ocupada entre semana."
              className="resize-none rounded-xl bg-soi-tray p-3 text-base outline-none" aria-describedby="desc-hint desc-count" />
            <p id="desc-count" className="nums -mt-1 text-right text-xs text-soi-muted">{description.length}/{MAX}</p>
            <p id="desc-hint" className="flex gap-2 text-sm text-soi-muted"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Describe un arquetipo, no a una persona que conozcas.</p>
            <label htmlFor="pname" className="text-sm font-semibold">Nombre (opcional)</label>
            <input id="pname" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="h-11 rounded-lg bg-soi-tray px-3 text-base outline-none" />
          </>
        )}
        {error && <p role="alert" className="text-sm text-soi-danger">{error}</p>}
        <Button type="submit" disabled={busy !== null || (adjust ? delta.trim().length < 4 : description.trim().length < MIN)} className="bg-[#008069] hover:bg-[#006E5A]">
          {busy === 'generate' ? 'Generando…' : 'Generar'}
        </Button>
        <p className="text-xs text-soi-muted">Esta persona es ficticia. Su voz, su día y sus emociones son simulados.</p>
      </form>

      {!adjust && presets.length > 0 && (
        <section aria-labelledby="presets-title">
          <h2 id="presets-title" className="px-1 text-sm font-semibold text-soi-muted">O empieza con alguien listo</h2>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {presets.map((p) => (
              <li key={p.id}>
                <button type="button" disabled={busy !== null} onClick={() => void addPreset(p.id)} className="press flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-soft disabled:opacity-60">
                  <PersonaAvatar name={p.described.name} hue={(p.id.charCodeAt(0) * 47) % 360} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{p.described.name}, {p.described.age} · <span className="font-normal text-soi-muted">{DIFFICULTY[p.described.difficulty]}</span></span>
                    <span className="block truncate text-sm text-soi-muted">{p.scenario}</span>
                  </span>
                  <span className="text-sm font-medium text-[#005C4B]">{busy === `preset:${p.id}` ? '…' : 'Agregar'}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
