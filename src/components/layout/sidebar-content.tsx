import Link from 'next/link';
import { Plus, Settings, Flame, Shield } from 'lucide-react';
import { AGENTS, PRACTICE_AGENTS } from '@/config/agents';
import { MY_SPACE } from '@/config/navigation';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SidebarData = {
  name: string;
  avatarUrl: string | null;
  streak: number;
  shields: number;
  plan: 'trial' | 'free' | 'soi_plus';
  trialDaysLeft: number;
  conversations: { id: string; title: string }[];
};

/** Contenido compartido entre sidebar desktop/tablet y drawer móvil. `compact` = tablet colapsado. */
export function SidebarContent({ data, compact = false }: { data: SidebarData; compact?: boolean }) {
  const hide = compact ? 'sr-only' : '';
  const item = cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/10', compact && 'justify-center px-0');
  return (
    <div className="flex h-full flex-col gap-4 p-4 text-white">
      <Link href="/chat" className={cn('text-2xl font-bold tracking-tight', compact && 'text-center text-xl')} aria-label="SOI, inicio">
        SOI<span className="text-soi-gold">.</span>
      </Link>

      <Link href="/chat" className={buttonClass('gold', compact ? 'icon' : 'md', compact ? 'mx-auto' : 'w-full')} aria-label="Nueva conversación">
        <Plus className="h-5 w-5" aria-hidden="true" /> <span className={hide}>Nueva conversación</span>
      </Link>

      <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto">
        <p className={cn('px-3 pb-1 text-xs font-semibold tracking-widest text-white/60', hide)}>PRÁCTICAS</p>
        <ul>
          {PRACTICE_AGENTS.map((id) => {
            const a = AGENTS[id];
            const href = id === 'rutinas' ? '/rutinas' : `/chat?agent=${id}`;
            return (
              <li key={id}>
                <Link href={href} className={item} title={a.label}>
                  <span style={{ color: a.color }}><Icon name={a.icon} /></span>
                  <span className={hide}>{a.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <p className={cn('mt-4 px-3 pb-1 text-xs font-semibold tracking-widest text-white/60', hide)}>MI ESPACIO</p>
        <ul>
          {MY_SPACE.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className={item} title={s.label}>
                <Icon name={s.icon} /> <span className={hide}>{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        {!compact && data.conversations.length > 0 && (
          <>
            <p className="mt-4 px-3 pb-1 text-xs font-semibold tracking-widest text-white/60">RECIENTES</p>
            <ul>
              {data.conversations.map((c) => (
                <li key={c.id}>
                  <Link href={`/chat/${c.id}`} className="block truncate rounded-xl px-3 py-1.5 text-sm text-white/80 hover:bg-white/10">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-white/15 pt-3">
        <p className={cn('flex items-center gap-2 px-3 py-1 text-sm', compact && 'justify-center px-0')} title={`Racha: ${data.streak} días`}>
          <Flame className="h-5 w-5 text-orange-400" aria-hidden="true" />
          <span className={hide}>Racha: {data.streak} {data.streak === 1 ? 'día' : 'días'}</span>
          {!compact && data.shields > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-xs text-white/70" title="Escudos de racha">
              <Shield className="h-4 w-4" aria-hidden="true" />{data.shields}
            </span>
          )}
        </p>
        <Link href="/ajustes" className={item}><Settings className="h-5 w-5" aria-hidden="true" /><span className={hide}>Ajustes</span></Link>
        <Link href="/perfil" className={cn(item, 'mt-1')}>
          {data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-soi-gold font-semibold text-soi-ink" aria-hidden="true">
              {data.name.charAt(0).toUpperCase()}
            </span>
          )}
          <span className={cn('truncate', hide)}>{data.name}</span>
        </Link>

        {data.plan !== 'soi_plus' && (
          <Link href="/planes" className={buttonClass('gold', compact ? 'icon' : 'sm', cn('mt-3', compact ? 'mx-auto' : 'w-full'))} aria-label="Pasar a SOI+">
            {compact ? '+' : data.plan === 'trial' ? `Prueba: ${data.trialDaysLeft} d · Pasar a SOI+` : 'Pasar a SOI+'}
          </Link>
        )}
      </div>
    </div>
  );
}
