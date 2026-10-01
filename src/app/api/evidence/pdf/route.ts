import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { getSessionUser } from '@/lib/supabase/server';
import { canAccess, getProfile } from '@/lib/billing/check-access';
import { ESLABON_LABEL, type Eslabon } from '@/config/agents';

/** WinAnsi no soporta emojis: los quitamos. */
const safe = (s: string) => s.replace(/[^\u0000-\u00FF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026]/g, '');

function wrap(text: string, max = 90) {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      if ((line + ' ' + w).trim().length > max) { out.push(line); line = w; } else line = `${line} ${w}`.trim();
    }
    out.push(line);
  }
  return out;
}

export async function GET() {
  const { supabase, user } = await getSessionUser();
  if (!user) return new Response('No autorizado', { status: 401 });
  if (!(await canAccess(user.id, 'pdf_export')).allowed) return new Response('SOI+ requerido', { status: 402 });

  const profile = await getProfile(user.id);
  const { data: rows } = await supabase.from('agent_knowledge')
    .select('title, content, metadata, created_at')
    .eq('user_id', user.id).eq('category', 'evidencia')
    .order('created_at', { ascending: true }).limit(500);

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const gold = rgb(0.83, 0.69, 0.22);
  const ink = rgb(0.1, 0.1, 0.18);

  let page = pdf.addPage([595, 842]);
  let y = 790;
  const newPage = () => { page = pdf.addPage([595, 842]); y = 790; };
  const write = (t: string, size = 11, f = font, color = ink) => {
    for (const line of wrap(safe(t))) {
      if (y < 60) newPage();
      page.drawText(line, { x: 50, y, size, font: f, color });
      y -= size + 5;
    }
  };

  write('SOI.', 28, bold, gold);
  write('Diseña tu identidad. Vive tu propósito.', 12);
  y -= 8;
  write(`Muro de Evidencias de ${profile?.display_name ?? 'ti'}`, 16, bold);
  write(`Racha actual: ${profile?.streak_current ?? 0} días · Racha más larga: ${profile?.streak_longest ?? 0} días · Evidencias: ${rows?.length ?? 0}`, 10);
  y -= 12;

  for (const r of rows ?? []) {
    const eslabon = (r.metadata as { eslabon_soi?: Eslabon })?.eslabon_soi;
    write(`${new Date(r.created_at).toLocaleDateString('es-MX')} · ${eslabon ? ESLABON_LABEL[eslabon] : 'Resultado'}`, 9, font, gold);
    write(r.title, 12, bold);
    write(r.content, 10);
    y -= 10;
  }

  if (!rows?.length) write('Aún no hay evidencias. Tu primera está a una acción de distancia.', 12);

  const bytes = await pdf.save();
  return new Response(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="soi-evidencias-${new Date().toISOString().slice(0, 10)}.pdf"`,
    },
  });
}
