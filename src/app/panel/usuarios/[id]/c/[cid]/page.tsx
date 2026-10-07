import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin, audit } from '@/lib/admin/auth';
import { conversationMessages } from '@/lib/admin/data';

/** Lectura de una conversación para revisión (queda en la auditoría). */
export default async function PanelConversation({ params }: { params: Promise<{ id: string; cid: string }> }) {
  const admin = await requireAdmin();
  const { id, cid } = await params;
  const c = await conversationMessages(id, cid);
  if (!c) notFound();
  await audit(admin.id, 'ver_conversacion', id, { conversation_id: cid });
  const t = (iso: string) => new Intl.DateTimeFormat('es', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/panel/usuarios/${id}`} className="text-sm text-soi-muted hover:underline">← Cuenta</Link>
      <h1 className="mt-1 text-xl font-semibold">{String(c.conv.title ?? 'Conversación')}</h1>
      <p className="text-sm text-soi-muted">{t(c.conv.created_at as string)} · {c.msgs.length} mensajes</p>
      <ol className="mt-4 flex flex-col gap-3">
        {c.msgs.map((m) => (
          <li key={m.id as string} className={m.role === 'user' ? 'ml-auto max-w-[85%] rounded-[14px] bg-soi-tray px-3.5 py-2' : 'rounded-[14px] bg-white px-4 py-3 shadow-ring'}>
            <p className="nums text-[11px] text-soi-muted">{m.role === 'user' ? 'Persona' : `SOI · ${String(m.agent_category ?? '')}${m.provider ? ` · ${String(m.provider)}` : ''}${m.tokens_used ? ` · ${String(m.tokens_used)} tokens` : ''}`} · {t(m.created_at as string)}</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm">{String(m.content)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
