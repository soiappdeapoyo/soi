import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin, audit } from '@/lib/admin/auth';
import { userDetail } from '@/lib/admin/data';
import { UserActions } from '@/components/admin/user-actions';
import { outputText, type RunOutput } from '@/lib/moments/outputs';
import { listAcceptances } from '@/lib/legal';
import { AcceptancesList } from '@/components/admin/acceptances-list';
import { userSessions } from '@/lib/admin/analytics';
import { SessionPath, dur } from '@/components/admin/nav-viz';

const d = (iso: string | null | undefined) => (iso ? new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '—');
const n = (v: number) => new Intl.NumberFormat('es').format(v);
const PLAN: Record<string, string> = { trial: 'Prueba', free: 'Free', soi_plus: 'SOI+' };

function Section({ title, children, count }: { title: string; children: React.ReactNode; count?: number }) {
  return (
    <section className="rounded-[20px] bg-white p-5 shadow-ring">
      <h2 className="font-semibold">{title}{count !== undefined && <span className="nums font-normal text-soi-muted"> · {count}</span>}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** Inspección de una cuenta para revisión: perfil, uso, conversaciones, Moments, lo que escribió y su memoria. Queda auditado. */
export default async function PanelUser({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const [u, acceptances, nav] = await Promise.all([userDetail(id), listAcceptances({ userId: id, limit: 20 }), userSessions(id)]);
  if (!u) notFound();
  await audit(admin.id, 'ver_cuenta', id);
  const p = u.profile ?? {};
  const plan = String(p.plan ?? '');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/panel/usuarios" className="text-sm text-soi-muted hover:underline">← Usuarios</Link>
        <h1 className="mt-1 text-2xl font-semibold">{String(p.display_name ?? 'Sin nombre')}</h1>
        <p className="text-sm text-soi-muted">{u.auth.email} · entra con {u.auth.provider ?? '—'} · registro {d(u.auth.createdAt)} · último acceso {d(u.auth.lastSignIn)}</p>
      </div>

      <div id="navegacion">
        <Section title="Navegación" count={nav.sessions.length}>
          {nav.sessions.length ? (
            <ul className="flex flex-col gap-4">
              {nav.sessions.map((s) => (
                <li key={s.id} className="border-t border-black/[0.06] pt-3 first:border-0 first:pt-0">
                  <p className="mb-1.5 text-xs text-soi-muted">{d(s.start)} · {dur(Date.parse(s.end) - Date.parse(s.start))} · {s.views.length} {s.views.length === 1 ? 'pantalla' : 'pantallas'}</p>
                  <SessionPath session={s} />
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-soi-muted">{nav.error ? `No se pudo leer (${nav.error}).` : 'Sin navegación registrada en los últimos 30 días.'}</p>}
        </Section>
      </div>

      <Section title="Consentimiento legal" count={acceptances.rows.length}>
        {acceptances.rows.length
          ? <AcceptancesList rows={acceptances.rows} />
          : <p className="text-sm text-soi-muted">Aún no acepta los términos ni declara ser mayor de 18 años (se le pedirá al entrar).</p>}
      </Section>

      <Section title="Plan y uso">
        <dl className="nums grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <div><dt className="text-xs text-soi-muted">Plan</dt><dd className="font-medium">{PLAN[plan] ?? plan}{plan === 'trial' ? ` · hasta ${d(p.trial_ends_at as string)}` : ''}</dd></div>
          <div><dt className="text-xs text-soi-muted">Consultas gratis</dt><dd className="font-medium">{plan === 'free' ? String(p.free_queries_remaining ?? '—') : '—'}</dd></div>
          <div><dt className="text-xs text-soi-muted">Mensajes (7 días)</dt><dd className="font-medium">{n(u.usage.messages7)}</dd></div>
          <div><dt className="text-xs text-soi-muted">Tokens hoy · 7 días</dt><dd className="font-medium">{n(u.usage.tokensToday)} · {n(u.usage.tokens7)}</dd></div>
          <div><dt className="text-xs text-soi-muted">Racha</dt><dd className="font-medium">{String(p.streak_current ?? 0)} días</dd></div>
          <div><dt className="text-xs text-soi-muted">Zona horaria</dt><dd className="font-medium">{String(p.timezone ?? '—')}</dd></div>
          <div><dt className="text-xs text-soi-muted">Eslabón débil</dt><dd className="font-medium">{String(p.weakest_link ?? '—')}</dd></div>
          <div><dt className="text-xs text-soi-muted">Proveedores IA (7 días)</dt><dd className="font-medium">{u.usage.providers.map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}</dd></div>
        </dl>
        <div className="mt-4"><UserActions userId={id} /></div>
      </Section>

      <Section title="Perfil">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {([['goals', 'Metas'], ['blockers', 'Bloqueos'], ['dominant_emotion', 'Emoción dominante'], ['archetype', 'Arquetipo'], ['recurring_themes', 'Temas recurrentes'], ['country', 'País'], ['onboarding_completed', 'Descubrimiento completo']] as const).map(([k, label]) => (
            <div key={k}><dt className="text-xs text-soi-muted">{label}</dt><dd>{Array.isArray(p[k]) ? (p[k] as string[]).join(' · ') || '—' : String(p[k] ?? '—')}</dd></div>
          ))}
        </dl>
        {u.identities.length > 0 && <p className="mt-3 text-sm"><span className="text-xs text-soi-muted">Identidades:</span> {u.identities.map((i) => `${i.name} (${i.status})`).join(' · ')}</p>}
      </Section>

      <Section title="Conversaciones" count={u.conversations.length}>
        <ul className="flex flex-col gap-1">
          {u.conversations.map((c) => (
            <li key={c.id as string}>
              <Link href={`/panel/usuarios/${id}/c/${c.id}`} className="press flex flex-wrap items-baseline justify-between gap-2 rounded-lg px-2 py-2 text-sm hover:bg-soi-sidebar">
                <span className="font-medium">{String(c.title ?? 'Sin título')}</span>
                <span className="nums text-xs text-soi-muted">{String(c.agent_category ?? '')} · {String(c.message_count ?? 0)} mensajes · {d(c.last_message_at as string)}</span>
              </Link>
            </li>
          ))}
          {!u.conversations.length && <li className="text-sm text-soi-muted">Sin conversaciones.</li>}
        </ul>
      </Section>

      <Section title="Moments vividos y lo que escribió" count={u.runs.length}>
        <ul className="flex flex-col gap-2">
          {u.runs.map((r) => {
            const written = Object.values((r.outputs ?? {}) as Record<string, RunOutput>).map((o) => ({ type: o?.type, text: outputText(o) })).filter((x) => x.text);
            return (
              <li key={r.id as string} className="rounded-[14px] bg-soi-sidebar p-3 text-sm">
                <p className="font-medium">{String(r.moment_slug ?? r.moment_id)} <span className="nums font-normal text-soi-muted">· {d(r.started_at as string)} · {r.completed_at ? 'completado' : 'sin terminar'}{r.mood_before ? ` · ánimo ${r.mood_before}→${r.mood_after ?? '?'}` : ''}{r.helped === true ? ' · le ayudó' : r.helped === false ? ' · no del todo' : ''}</span></p>
                {r.learning && <p className="mt-1">«{String(r.learning)}»</p>}
                {written.map((w, i) => <p key={i} className="mt-1 text-soi-muted"><span className="text-xs">{w.type}:</span> {w.text}</p>)}
              </li>
            );
          })}
          {!u.runs.length && <li className="text-sm text-soi-muted">Aún no vive Moments.</li>}
        </ul>
      </Section>

      <Section title="Moments creados" count={u.moments.length}>
        <ul className="flex flex-col gap-1 text-sm">
          {u.moments.map((m) => <li key={m.id as string}><Link href={`/m/${m.id}`} className="hover:underline">{String(m.title)}</Link> <span className="nums text-xs text-soi-muted">· {String(m.kind)} · {String(m.status)} · {String(m.required_minutes)} min · {String(m.executions_count ?? 0)} ejecuciones</span></li>)}
          {!u.moments.length && <li className="text-soi-muted">Ninguno.</li>}
        </ul>
      </Section>

      <Section title="Memoria de SOI" count={u.memories.length}>
        <ul className="flex flex-col gap-1.5 text-sm">
          {u.memories.map((m) => (
            <li key={m.id as string}>
              <span className="text-xs text-soi-muted">{String(m.category)}{(m.tags as string[] | null)?.length ? ` · ${(m.tags as string[]).join(', ')}` : ''} · {d(m.created_at as string)}</span>
              <p className="whitespace-pre-line">{String(m.title)}{m.content ? ` — ${String(m.content).slice(0, 400)}` : ''}</p>
            </li>
          ))}
        </ul>
      </Section>

      {u.enemies.length > 0 && (
        <Section title="Batallas (enemigos registrados)" count={u.enemies.length}>
          <ul className="flex flex-col gap-1 text-sm">{u.enemies.map((e, i) => <li key={i}>{String(e.enemy)} <span className="text-xs text-soi-muted">· {String(e.source)} · {d(e.occurred_at as string)}</span>{e.evidence ? <span className="block text-soi-muted">«{String(e.evidence)}»</span> : null}</li>)}</ul>
        </Section>
      )}

      {u.crisis.length > 0 && (
        <details className="rounded-[20px] bg-white p-5 shadow-ring">
          <summary className="cursor-pointer font-semibold text-soi-danger">Señales de crisis <span className="nums font-normal">· {u.crisis.length}</span> <span className="text-xs font-normal text-soi-muted">(información muy sensible; se borra a los 90 días)</span></summary>
          <ul className="mt-3 flex flex-col gap-2 text-sm">{u.crisis.map((c) => <li key={c.id as string}><span className="text-xs text-soi-muted">{d(c.created_at as string)}</span><p>{String(c.content)}</p></li>)}</ul>
        </details>
      )}
    </div>
  );
}
