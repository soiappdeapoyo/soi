'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { PersonSpec, Slot } from '@/lib/persons/spec';
import type { DebriefReport } from '@/lib/persons/debrief';
import { buttonClass } from '@/components/ui/button';
import { PersonaAvatar } from './avatar';
import { DebriefView } from './debrief-view';

const fmt = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const STATE: Record<Slot['state'], string> = { online: 'Con el teléfono a la mano', free: 'Disponible', busy: 'Ocupada', asleep: 'Durmiendo' };
const DIFFICULTY = ['', 'Fácil: sus señales son muy claras', 'Media: tiene días buenos y malos', 'Difícil: se abre despacio'];

type Past = { id: string; created_at: string; messages_count: number; report: DebriefReport };

/** La ficha: quién es, sus límites, cómo es su día y el historial de feedback. Siempre con la marca de sintética. */
export function PersonaProfile({ personaId, spec, hue, avatar }: { personaId: string; spec: PersonSpec; hue: number; avatar?: string | null }) {
  const [past, setPast] = useState<Past[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    fetch(`/api/persons/${personaId}/debrief`).then((r) => (r.ok ? r.json() : { debriefs: [] })).then((d: { debriefs: Past[] }) => setPast(d.debriefs)).catch(() => setPast([]));
  }, [personaId]);
  const busy = spec.gender === 'masculino' ? 'Ocupado' : 'Ocupada';
  const asleep = 'Durmiendo';

  return (
    <div className="flex flex-col gap-5 text-[15px]">
      <div className="flex flex-col items-center text-center">
        <PersonaAvatar name={spec.name} hue={hue} src={avatar} size={112} ai />
        <p className="mt-3 text-xl font-semibold">{spec.name}, {spec.age}</p>
        <p className="text-soi-muted">{spec.profession} · {spec.city}</p>
        <p className="mt-2 rounded-full bg-[#E7F3EF] px-3 py-1 text-xs font-medium text-[#005C4B]">IA · persona sintética</p>
      </div>
      {spec.bio && <p className="leading-relaxed">{spec.bio}</p>}
      <dl className="grid gap-3">
        <div><dt className="text-sm font-semibold text-soi-muted">Personalidad</dt><dd>{spec.traits.join(' · ')}</dd></div>
        <div><dt className="text-sm font-semibold text-soi-muted">Le interesa</dt><dd className="mt-1 flex flex-wrap gap-1.5">{spec.interests.map((i) => <span key={i} className="rounded-full bg-soi-tray px-2.5 py-1 text-sm">{i}</span>)}</dd></div>
        <div><dt className="text-sm font-semibold text-soi-muted">Límites que no negocia</dt><dd><ul className="list-disc pl-5">{spec.boundaries.map((b) => <li key={b}>{b}</li>)}</ul></dd></div>
        <div><dt className="text-sm font-semibold text-soi-muted">Cómo escribe</dt><dd>{spec.style}</dd></div>
        <div><dt className="text-sm font-semibold text-soi-muted">Dificultad</dt><dd>{DIFFICULTY[spec.difficulty]}</dd></div>
        <div>
          <dt className="text-sm font-semibold text-soi-muted">Su día entre semana</dt>
          <dd><ul className="mt-1 flex flex-col gap-0.5 text-sm">
            {spec.derived.dayPlan.weekday.map((s) => (
              <li key={s.from} className="flex min-w-0 gap-3"><span className="nums w-[6.5rem] shrink-0 text-soi-muted">{fmt(s.from)}–{fmt(s.to)}</span><span>{s.activity ? s.activity.charAt(0).toUpperCase() + s.activity.slice(1) : s.state === 'busy' ? busy : s.state === 'asleep' ? asleep : STATE[s.state]}</span></li>
            ))}
          </ul></dd>
        </div>
      </dl>
      <p className="text-sm text-soi-muted">{spec.name} es un personaje ficticio: su voz, su día y sus emociones son simulados para que practiques. No es una persona real.</p>
      <Link href={`/persons/${personaId}/ajustar`} className={buttonClass('outline', 'md', 'w-full')}>Ajustar personaje</Link>

      <section aria-labelledby="pp-history">
        <h3 id="pp-history" className="text-sm font-semibold text-soi-muted">Feedback de tus sesiones</h3>
        {past === null ? <p className="mt-2 text-sm text-soi-muted">Cargando…</p>
          : !past.length ? <p className="mt-2 text-sm text-soi-muted">Aún no hay. Al terminar una sesión (menú ⋮) tu coach te deja el feedback.</p>
          : (
            <ul className="mt-2 flex flex-col gap-2">
              {past.map((d) => (
                <li key={d.id} className="rounded-xl bg-soi-tray">
                  <button type="button" className="flex w-full items-center justify-between p-3 text-left text-sm" aria-expanded={open === d.id} onClick={() => setOpen(open === d.id ? null : d.id)}>
                    <span>{new Date(d.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} · {d.messages_count} mensajes</span>
                    <span className="text-soi-muted">{open === d.id ? 'Ocultar' : 'Ver'}</span>
                  </button>
                  {open === d.id && <div className="border-t border-black/5 bg-white p-3"><DebriefView report={d.report} name={spec.name} gender={spec.gender} /></div>}
                </li>
              ))}
            </ul>
          )}
      </section>
    </div>
  );
}
