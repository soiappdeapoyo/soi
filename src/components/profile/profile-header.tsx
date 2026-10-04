import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { Avatar } from '@/components/feed/avatar';
import type { ProfileCard } from '@/lib/social/profile';
import { ProfileLinks } from './profile-links';

const n = (v: number) => new Intl.NumberFormat('es', { notation: v >= 10_000 ? 'compact' : 'standard' }).format(v);

/** Cabecera de perfil estilo Substack: foto grande, nombre, @usuario, biografía, enlaces, seguidores y acciones. */
export function ProfileHeader({ card, actions }: { card: ProfileCard; actions?: React.ReactNode }) {
  return (
    <header>
      <Avatar url={card.avatar_url} name={card.display_name} size={84} className="text-2xl" />
      <h1 className="mt-3 flex items-center gap-1.5 text-2xl font-semibold tracking-tight">
        <span className="truncate">{card.display_name}</span>
        {card.is_verified && <BadgeCheck className="h-5 w-5 shrink-0 text-soi-accent" aria-label="Creador verificado" />}
      </h1>
      {card.handle && (
        <p className="text-sm text-soi-muted">
          <Link href={`/c/${card.handle}`} className="hover:underline underline-offset-4">@{card.handle}</Link>
        </p>
      )}
      {card.bio && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-soi-ink">{card.bio}</p>}
      <ProfileLinks links={card.links} />
      <p className="nums mt-2 text-sm text-soi-muted">
        <span className="font-medium text-soi-ink">{n(card.followers)}</span> {card.followers === 1 ? 'seguidor' : 'seguidores'}
        <span aria-hidden="true"> · </span>
        <span className="font-medium text-soi-ink">{n(card.following)}</span> siguiendo
      </p>
      {actions && <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
