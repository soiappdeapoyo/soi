import { cn } from '@/lib/utils';

export function Avatar({ url, name, size = 36, className }: { url: string | null; name: string; size?: number; className?: string }) {
  const style = { width: size, height: size };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" style={style} className={cn('shrink-0 rounded-full object-cover', className)} />
  ) : (
    <span aria-hidden="true" style={style} className={cn('flex shrink-0 items-center justify-center rounded-full bg-soi-tray text-sm font-medium text-soi-muted', className)}>
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/** "ahora", "5 min", "3 h", "2 d", "12 sep" — corto, como en los feeds. */
export function shortTime(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86_400) return `${Math.floor(s / 3600)} h`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)} d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}
