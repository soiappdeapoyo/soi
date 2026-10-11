import { analyzeChat } from '@/lib/analytics/funnel';
import type { loadChatOutcomes } from '@/lib/admin/signups';
import { pct } from '@/components/admin/nav-viz';

type Chat = ReturnType<typeof analyzeChat>;
type Outcomes = Awaited<ReturnType<typeof loadChatOutcomes>>;

const AUTHOR: Record<string, string> = { neville: 'Neville', tracy: 'Brian Tracy', hill: 'Napoleon Hill', general: 'Sin autor (?de=)' };
const ERROR: Record<string, string> = { limite: 'Tope de 3 Moments al día por visitante', saturado: 'Tope diario general (400)', ia: 'La IA no respondió' };

function Tile({ label, n, hint }: { label: string; n: number | string; hint?: string }) {
  return (
    <div className="rounded-[14px] bg-soi-sidebar p-3">
      <p className="text-xs text-soi-muted">{label}</p>
      <p className="nums mt-1 text-xl font-semibold">{n}</p>
      {hint && <p className="text-xs text-soi-muted">{hint}</p>}
    </div>
  );
}

/** El chat de la landing: de escribir a vivir su primer Moment, dónde se quedan, por autor, crisis y errores. */
export function ChatView({ chat, outcomes }: { chat: Chat; outcomes: Outcomes }) {
  const first = chat.steps[0]?.count ?? 0;
  if (!first && !chat.steps[4]?.count) return <p className="text-sm text-soi-muted">Todavía nadie ha escrito en el chat de la landing en este periodo.</p>;
  const top = Math.max(1, ...chat.steps.map((s) => s.count));
  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-col gap-3">
        {chat.steps.map((s, i) => {
          const prev = i > 0 ? chat.steps[i - 1]!.count : null;
          return (
            <li key={s.id} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span>{s.label}</span>
                <span className="nums shrink-0 text-soi-muted">
                  <span className="font-semibold text-soi-ink">{s.count}</span>
                  {prev && s.count <= prev ? ` · ${pct(s.count / prev)} del paso anterior` : ''}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-black/[0.05]" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-soi-accent-fill" style={{ width: `${Math.max(1.5, (s.count / top) * 100)}%` }} />
              </div>
            </li>
          );
        })}
      </ol>
      <p className="-mt-3 text-xs text-soi-muted">«Entraron y lo guardaron» cuenta Moments reclamados, no navegadores: el enlace mágico puede abrirse en otro.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Vivieron su Moment completo" n={outcomes.error ? '—' : outcomes.lived} hint={outcomes.error ? undefined : `de ${outcomes.claimed} guardados`} />
        <Tile label="Lo empezaron sin terminar" n={outcomes.error ? '—' : outcomes.started} />
        <Tile label="Recibieron su Moment y se registraron" n={chat.signupDesigned} hint="En el mismo navegador" />
        <Tile label="Señales de crisis" n={chat.crisis} hint="Recibieron líneas de ayuda" />
      </div>
      {outcomes.error && <p className="text-xs text-soi-muted">No se pudo leer qué pasó con los Moments guardados ({outcomes.error}). ¿Ya se aplicó la migración 0034?</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        {chat.stoppedAt.some(Boolean) && (
          <section aria-label="Dónde se quedan">
            <h3 className="mb-2 text-sm font-medium text-soi-muted">Se fueron sin su Moment después de…</h3>
            <ul className="flex flex-col gap-1.5 text-sm">
              {chat.stoppedAt.map((n, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>{i === 0 ? 'Su primer mensaje' : `Su mensaje ${i + 1}`}</span>
                  <span className="nums text-soi-muted"><span className="font-semibold text-soi-ink">{n}</span> · {pct(n / Math.max(1, first))}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {chat.byAuthor.length > 0 && (
          <section aria-label="Por autor del video">
            <h3 className="mb-2 text-sm font-medium text-soi-muted">Por autor del video</h3>
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-soi-muted">
                <tr><th className="pb-1 font-normal">Autor</th><th className="pb-1 text-right font-normal">Diseñados</th><th className="pb-1 text-right font-normal">Comenzar</th><th className="pb-1 text-right font-normal">Guardados</th></tr>
              </thead>
              <tbody className="nums">
                {chat.byAuthor.map((r) => (
                  <tr key={r.author} className="border-t border-black/5">
                    <td className="py-1.5">{AUTHOR[r.author] ?? r.author}</td>
                    <td className="py-1.5 text-right">{r.designed}</td>
                    <td className="py-1.5 text-right">{r.started}</td>
                    <td className="py-1.5 text-right">{r.claimed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>

      {chat.errors.length > 0 && (
        <section aria-label="Errores">
          <h3 className="mb-2 text-sm font-medium text-soi-muted">No se pudo diseñar su Moment</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {chat.errors.map((e) => (
              <li key={e.kind} className="flex justify-between gap-3"><span>{ERROR[e.kind] ?? e.kind}</span><span className="nums font-semibold">{e.count}</span></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
