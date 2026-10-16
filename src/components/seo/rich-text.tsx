import Link from 'next/link';
import { Fragment } from 'react';

/** `[texto](/ruta)` (solo enlaces internos) y `**negritas**`. */
const TOKEN = /\[([^\]]+)\]\((\/[^)\s]*)\)|\*\*([^*]+)\*\*/g;

/** Texto del contenido SEO con enlaces internos y negritas, sin HTML crudo. */
export function RichText({ text }: { text: string }) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] && m[2]) {
      out.push(<Link key={m.index} href={m[2]} className="font-medium text-soi-ink underline decoration-soi-accent/40 underline-offset-2 hover:decoration-soi-accent">{m[1]}</Link>);
    } else {
      out.push(<strong key={m.index} className="font-semibold text-soi-ink">{m[3]}</strong>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}
