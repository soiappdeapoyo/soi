import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { SKILLS, type DebriefReport } from '@/lib/persons/debrief';
import { labelText } from '@/lib/persons/emotion';
import type { Gender } from '@/lib/persons/spec';

/** El feedback de una sesión: habilidades, lo que funcionó, qué probar, una reescritura, emociones y puntos ciegos. */
export function DebriefView({ report, name, gender }: { report: DebriefReport; name: string; gender: Gender }) {
  return (
    <div className="flex flex-col gap-6 text-[15px]">
      <p className="leading-relaxed">{report.summary}</p>

      <section aria-labelledby="db-skills">
        <h3 id="db-skills" className="text-sm font-semibold text-soi-muted">Tus habilidades en esta sesión</h3>
        <ul className="mt-2 flex flex-col gap-2">
          {SKILLS.map((s) => {
            const v = report.scores[s.id];
            return (
              <li key={s.id} className="flex min-w-0 items-center gap-3">
                <span className="w-[7.5rem] shrink-0 truncate text-sm">{s.label}</span>
                <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-soi-tray" aria-hidden="true">
                  <span className="block h-full rounded-full bg-[#008069]" style={{ width: `${(v / 5) * 100}%` }} />
                </span>
                <span className="nums w-8 text-right text-sm font-medium">{v}/5</span>
              </li>
            );
          })}
        </ul>
      </section>

      {report.highlights.length > 0 && (
        <section aria-labelledby="db-good">
          <h3 id="db-good" className="text-sm font-semibold text-soi-muted">Lo que funcionó</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {report.highlights.map((h, i) => (
              <li key={i} className="rounded-xl bg-[#D9FDD3]/60 p-3">
                <p className="italic [overflow-wrap:anywhere]">«{h.quote}»</p>
                <p className="mt-1 text-sm text-soi-muted">{h.why}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {report.improvements.length > 0 && (
        <section aria-labelledby="db-try">
          <h3 id="db-try" className="text-sm font-semibold text-soi-muted">Para la próxima</h3>
          <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5">
            {report.improvements.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </section>
      )}

      {report.rewrite && (
        <section aria-labelledby="db-rewrite">
          <h3 id="db-rewrite" className="text-sm font-semibold text-soi-muted">Otra forma de decirlo</h3>
          <p className="mt-2 rounded-xl bg-soi-tray p-3 text-soi-muted line-through decoration-black/20 [overflow-wrap:anywhere]">{report.rewrite.original}</p>
          <ul className="mt-2 flex flex-col gap-2">
            {report.rewrite.alternatives.map((a, i) => <li key={i} className="rounded-xl bg-[#D9FDD3] p-3">{a}</li>)}
          </ul>
          <p className="mt-2 text-sm text-soi-muted">{report.rewrite.why}</p>
        </section>
      )}

      {report.timeline.length > 0 && (
        <section aria-labelledby="db-emotions">
          <h3 id="db-emotions" className="text-sm font-semibold text-soi-muted">Cómo se fue sintiendo {name}</h3>
          <ol className="mt-2 flex flex-col gap-1.5">
            {report.timeline.map((p) => (
              <li key={p.turn} className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <span className="nums w-16 shrink-0 text-soi-muted">Turno {p.turn}</span>
                {p.trend === 'up' ? <ArrowUp className="h-4 w-4 text-[#117A3E]" aria-label="subió" /> : p.trend === 'down' ? <ArrowDown className="h-4 w-4 text-soi-danger" aria-label="bajó" /> : <Minus className="h-4 w-4 text-soi-subtle" aria-label="igual" />}
                <span className="font-medium">{labelText(p.label, gender)}</span>
                {p.cause && <span className="text-soi-muted">· {p.cause}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {report.blindSpots.length > 0 && (
        <section aria-labelledby="db-blind">
          <h3 id="db-blind" className="text-sm font-semibold text-soi-muted">Señales que se te pasaron</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {report.blindSpots.map((b, i) => (
              <li key={i} className="rounded-xl bg-[#FFF3C4] p-3 text-sm [overflow-wrap:anywhere]">
                <p><span className="font-medium">{name}:</span> «{b.persona}»</p>
                {b.next && <p className="mt-1"><span className="font-medium">Tú:</span> «{b.next}»</p>}
                <p className="mt-1.5 text-soi-muted">{b.tip}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-soi-muted">Las emociones de {name} son simuladas: sirven para practicar a leer señales. {report.source === 'rules' ? 'Este feedback se calculó sin IA por ahora.' : ''}</p>
    </div>
  );
}
