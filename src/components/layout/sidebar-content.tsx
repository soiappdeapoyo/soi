import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Settings, Flame, Shield } from 'lucide-react';
import { AGENTS, PRACTICE_AGENTS } from '@/config/agents';
import { MY_SPACE } from '@/config/navigation';
import { Icon } from '@/components/ui/icon';
import { buttonClass } from '@/components/ui/button';
import { NavLink } from './nav-link';
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

/**
 * Contenido compartido entre sidebar desktop/tablet y drawer móvil. `compact` = tablet colapsado (72 px).
 * Estilo: fondo cálido claro, íconos monocromos de trazo 1.5, etiquetas de sección en tono atenuado.
 */
export function SidebarContent({ data, compact = false }: { data: SidebarData; compact?: boolean }) {
  const hide = compact ? 'sr-only' : '';
  const item = cn(
    'press flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] text-soi-ink/85 hover:bg-black/[0.04] hover:text-soi-ink',
    compact && 'justify-center px-0',
  );
  const active = 'bg-black/[0.05] font-medium text-soi-ink';
  const section = cn('px-3 pb-1 pt-4 text-xs text-soi-muted', hide);

  return (
    <div className="flex h-full flex-col gap-3 p-3 text-soi-ink">
      <Link href="/chat" className={cn('press px-1 pt-1 text-2xl font-semibold tracking-tight', compact && 'text-center text-xl')} aria-label="SOI, inicio">
        SOI.
      </Link>

      <Link
        href="/chat"
        className={buttonClass('secondary', compact ? 'icon' : 'md', cn('rounded-xl', compact ? 'mx-auto' : 'h-auto min-h-12 w-full justify-start py-2.5 text-left'))}
        aria-label="Nueva conversación"
      >
        <Plus className="h-5 w-5 shrink-0" aria-hidden="true" /> <span className={hide}>Nueva conversación</span>
      </Link>

      <nav aria-label="Navegación principal" className="-mx-1 flex-1 overflow-y-auto px-1">
        <Suspense>
          <p className={cn(section, 'pt-2')}>Prácticas</p>
          <ul className="flex flex-col gap-0.5">
            {PRACTICE_AGENTS.map((id) => {
              const a = AGENTS[id];
              const href = id === 'rutinas' ? '/rutinas' : `/chat?agent=${id}`;
              return (
                <li key={id}>
                  <NavLink href={href} className={item} activeClassName={active} title={a.label}>
                    <Icon name={a.icon} className="h-5 w-5 shrink-0" />
                    <span className={hide}>{a.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          <p className={section}>Mi espacio</p>
          <ul className="flex flex-col gap-0.5">
            {MY_SPACE.map((s) => (
              <li key={s.href}>
                <NavLink href={s.href} className={item} activeClassName={active} title={s.label}>
                  <Icon name={s.icon} className="h-5 w-5 shrink-0" /> <span className={hide}>{s.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {!compact && data.conversations.length > 0 && (
            <>
              <p className={section}>Recientes</p>
              <ul className="flex flex-col gap-0.5">
                {data.conversations.map((c) => (
                  <li key={c.id}>
                    <NavLink href={`/chat/${c.id}`} className="press block truncate rounded-lg px-3 py-2 text-sm text-soi-muted hover:bg-black/[0.04] hover:text-soi-ink" activeClassName={active}>
                      {c.title}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Suspense>
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-black/[0.06] pt-3">
        <p className={cn('flex min-h-9 items-center gap-3 px-3 text-sm', compact && 'justify-center px-0')} title={`Racha: ${data.streak} días`}>
          <Flame className="h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />
          <span className={cn('nums', hide)}>Racha: {data.streak} {data.streak === 1 ? 'día' : 'días'}</span>
          {!compact && data.shields > 0 && (
            <span className="nums ml-auto inline-flex items-center gap-1 text-xs text-soi-muted" title="Escudos de racha">
              <Shield className="h-4 w-4" aria-hidden="true" />{data.shields}
            </span>
          )}
        </p>
        <Suspense>
          <NavLink href="/ajustes" className={item} activeClassName={active} title="Ajustes">
            <Settings className="h-5 w-5 shrink-0" aria-hidden="true" /><span className={hide}>Ajustes</span>
          </NavLink>
          <NavLink href="/perfil" className={item} activeClassName={active} title="Mi perfil">
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt="" className="h-7 w-7 shrink-0 rounded-full" />
            ) : (
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soi-ink text-xs font-semibold text-white" aria-hidden="true">
                {data.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className={cn('truncate', hide)}>{data.name}</span>
          </NavLink>
        </Suspense>

        {data.plan !== 'soi_plus' && (
          <Link href="/planes" className={buttonClass('gold', compact ? 'icon' : 'sm', cn('mt-2', compact ? 'mx-auto' : 'w-full'))} aria-label="Pasar a SOI+">
            {compact ? '+' : data.plan === 'trial' ? <span className="nums">Prueba: {data.trialDaysLeft} d · Pasar a SOI+</span> : 'Pasar a SOI+'}
          </Link>
        )}
      </div>
    </div>
  );
}
