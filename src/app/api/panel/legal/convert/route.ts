import mammoth from 'mammoth';
import { adminFromRequest } from '@/lib/admin/auth';
import { LEGAL_MAX_CHARS, wordHtmlToMarkdown } from '@/lib/legal';

const MAX_BYTES = 5 * 1024 * 1024;

/** Lee un archivo de términos o privacidad (.md, .txt o .docx) y devuelve su texto en Markdown para revisarlo antes de publicar. */
export async function POST(req: Request) {
  const admin = await adminFromRequest();
  if (!admin) return new Response('No encontrado', { status: 404 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) return Response.json({ ok: false, message: 'Elige un archivo.' }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ ok: false, message: 'El archivo pesa más de 5 MB.' }, { status: 400 });

  const ext = file.name.toLowerCase().split('.').pop();
  let content: string;
  if (ext === 'md' || ext === 'markdown' || ext === 'txt') {
    content = (await file.text()).replace(/\r\n?/g, '\n').trim();
  } else if (ext === 'docx') {
    try {
      const { value } = await mammoth.convertToHtml({ buffer: Buffer.from(await file.arrayBuffer()) });
      content = wordHtmlToMarkdown(value);
    } catch {
      return Response.json({ ok: false, message: 'No se pudo leer el documento de Word.' }, { status: 400 });
    }
  } else {
    return Response.json({ ok: false, message: 'Usa un archivo .docx (Word), .md o .txt. Si tienes un PDF, guárdalo como Word.' }, { status: 400 });
  }
  if (!content) return Response.json({ ok: false, message: 'El archivo está vacío.' }, { status: 400 });
  if (content.length > LEGAL_MAX_CHARS) return Response.json({ ok: false, message: 'El documento es demasiado largo.' }, { status: 400 });
  return Response.json({ ok: true, content });
}
