import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, Link2 } from 'lucide-react';
import { getSessionUser } from '@/lib/supabase/server';
import { getProfile } from '@/lib/billing/check-access';
import { loadLifeGraph, type LifeNode } from '@/lib/life-graph';
import { Biblioteca } from '@/components/social/feed-sections';

export const metadata: Metadata = { title: 'Mi Vida' };

/**
 * Mi Vida: tu grafo personal. El usuario no es una lista de tareas: es un sistema donde
 * metas, creencias, fuentes, hábitos y resultados están conectados.
 * Visual: un índice de nodos (la "constelación") y bandejas por categoría — sin canvas pesado.
 */
export default async function MiVidaPage() {
  const { supabase, user } = await getSessionUser();
  if (!user) redirect('/login');
  const profile = await getProfile(user.id);
  const groups = await loadLifeGraph(supabase, user.id, profile);
  const total = groups.reduce((a, g) => a + g.nodes.length, 0);

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 md:py-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Mi Vida</h1>
        <p className="text-soi-muted">Tu sistema personal, todo conectado.</p>
      </header>

      <nav aria-label="Categorías" className="nums mt-5 grid grid-cols-2 gap-1.5 rounded-[14px] bg-soi-sidebar p-1.5 sm:grid-cols-4">
        {groups.map((g) => (
          <a key={g.id} href={`#${g.id}`} className="press flex items-baseline justify-between gap-2 rounded-lg bg-white px-3 py-2.5 shadow-ring hover:shadow-soft">
            <span className="truncate text-sm">{g.label}</span>
            <span className={g.nodes.length ? 'text-sm font-medium text-soi-ink' : 'text-sm text-soi-subtle'}>{g.nodes.length}</span>
          </a>
        ))}
      </nav>
      {total === 0 && (
        <p className="mt-3 text-sm text-soi-muted">
          Todavía está en blanco. <Link href="/chat" className="text-soi-accent underline underline-offset-4">Habla con SOI</Link> y tu sistema empezará a tomar forma.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-6">
        {groups.map((g) => (
          <section key={g.id} id={g.id} aria-labelledby={`${g.id}-t`} className="scroll-mt-20">
            <h2 id={`${g.id}-t`} className="mb-2 text-sm font-medium text-soi-muted">{g.label}</h2>
            {g.nodes.length ? (
              <ul className="flex flex-col gap-1.5 rounded-[20px] bg-soi-sidebar p-1.5">
                {g.nodes.map((n) => <li key={n.id}><Node n={n} /></li>)}
              </ul>
            ) : (
              <p className="rounded-[14px] bg-soi-sidebar p-4 text-sm text-soi-muted">{g.empty}</p>
            )}
          </section>
        ))}

        <section id="biblioteca" aria-label="Biblioteca" className="scroll-mt-20">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">Biblioteca</h2>
          <Biblioteca supabase={supabase} userId={user.id} />
        </section>
      </div>
    </div>
  );
}

function Node({ n }: { n: LifeNode }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[15px]">{n.title}</span>
        {n.detail && <span className="block text-xs text-soi-muted">{n.detail}</span>}
      </span>
      {n.href && <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-soi-subtle" aria-hidden="true" />}
    </>
  );
  return (
    <div className="rounded-[14px] bg-white shadow-ring">
      {n.href
        ? <Link href={n.href} className="press flex items-start gap-3 p-3">{body}</Link>
        : <div className="flex items-start gap-3 p-3">{body}</div>}
      {n.links.length > 0 && (
        <p className="flex flex-wrap gap-1.5 px-3 pb-3">
          {n.links.map((l) => (
            <Link key={l.href} href={l.href} className="press inline-flex items-center gap-1 rounded-md bg-soi-accent-soft px-2 py-0.5 text-xs text-soi-accent">
              <Link2 className="h-3 w-3" aria-hidden="true" /> Conectado con {l.label}
            </Link>
          ))}
        </p>
      )}
    </div>
  );
}
