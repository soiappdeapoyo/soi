import { createAdminClient } from '@/lib/supabase/server';

/** Términos y avisos de privacidad: se suben en /panel → Términos y se muestran en su página pública. */
export const LEGAL_KINDS = {
  terminos: { title: 'Términos de uso', path: '/terminos' },
  privacidad: { title: 'Aviso de privacidad', path: '/privacidad' },
  privacidad_corto: { title: 'Aviso de privacidad simplificado', path: '/privacidad/simplificado' },
} as const;
export type LegalKind = keyof typeof LEGAL_KINDS;
export const LEGAL_KIND_IDS = Object.keys(LEGAL_KINDS) as [LegalKind, ...LegalKind[]];
export const isLegalKind = (k: unknown): k is LegalKind => typeof k === 'string' && k in LEGAL_KINDS;

export const LEGAL_MAX_CHARS = 200_000;

export type LegalDoc = { id: string; kind: LegalKind; content: string; fileName: string | null; createdAt: string };

/** La versión publicada más reciente, o null si aún no se ha subido ninguna (o la base no responde). */
export async function latestLegal(kind: LegalKind): Promise<LegalDoc | null> {
  try {
    const { data } = await createAdminClient().from('legal_documents')
      .select('id, kind, content, file_name, created_at').eq('kind', kind)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    return data ? { id: data.id, kind, content: data.content, fileName: data.file_name, createdAt: data.created_at } : null;
  } catch {
    return null;
  }
}

/** Separa el primer encabezado H1 del documento (si lo trae) para usarlo como título de la página. */
export function splitTitle(md: string): { title: string | null; body: string } {
  const m = md.match(/^\s*#\s+([^\n]+)\n*/);
  return m ? { title: (m[1] ?? '').replace(/[*_`]/g, '').trim(), body: md.slice(m[0].length) } : { title: null, body: md };
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const decode = (s: string) => s.replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e: string) => {
  if (e.startsWith('#')) return String.fromCodePoint(e[1]?.toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENTITIES[e.toLowerCase()] ?? m;
});

/**
 * Convierte el HTML que produce mammoth (Word → HTML: h1–h6, p, strong, em, listas, enlaces, tablas) a Markdown.
 * No pretende cubrir HTML arbitrario: solo lo que mammoth genera.
 */
export function wordHtmlToMarkdown(html: string): string {
  let s = html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<a [^>]*id="[^"]*"[^>]*><\/a>/gi, '') // anclas vacías de Word
    .replace(/<br\s*\/?>/gi, '  \n')
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, (_, __, t: string) => (t.trim() ? `**${t.trim()}**` : ''))
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, (_, __, t: string) => (t.trim() ? `*${t.trim()}*` : ''))
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_, href: string, t: string) => `[${t}](${href})`)
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n: string, t: string) => `\n\n${'#'.repeat(Number(n))} ${t.trim()}\n\n`)
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t: string) => `\n\n${t.trim()}\n\n`)
    .replace(/<\/?(table|thead|tbody)[^>]*>/gi, '\n\n')
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, row: string) =>
      `\n${row.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, (__, c: string) => `${c.replace(/\s*\n+\s*/g, ' ').trim()} · `).replace(/ · $/, '')}\n`);

  // Listas (con anidación): se recorren las etiquetas en orden.
  let out = '';
  const stack: ('ul' | 'ol')[] = [];
  const counters: number[] = [];
  for (const part of s.split(/(<\/?(?:ul|ol|li)[^>]*>)/i)) {
    const tag = part.match(/^<(\/?)(ul|ol|li)/i);
    if (!tag) { out += stack.length ? part.replace(/\s*\n+\s*/g, ' ') : part; continue; }
    const [, close, name] = tag;
    const n = (name ?? '').toLowerCase();
    if (n === 'ul' || n === 'ol') {
      if (close) { stack.pop(); counters.pop(); if (!stack.length) out += '\n\n'; }
      else { if (!stack.length) out += '\n\n'; stack.push(n as 'ul' | 'ol'); counters.push(0); }
    } else if (!close) {
      const depth = stack.length - 1;
      const count = (counters[depth] ?? 0) + 1;
      counters[depth] = count;
      const marker = stack[depth] === 'ol' ? `${count}.` : '-';
      out += `\n${'   '.repeat(Math.max(0, depth))}${marker} `;
    }
  }
  s = out;

  return decode(s.replace(/<[^>]+>/g, ''))
    .split('\n').map((l) => l.replace(/[ \t]+$/g, (m) => (m === '  ' ? m : ''))).join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
