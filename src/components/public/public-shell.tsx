import Link from 'next/link';
import { buttonClass } from '@/components/ui/button';

/** Marco de las páginas públicas de creadores y Blueprints (llegadas desde Instagram, TikTok o Substack). */
export function PublicShell({ children, signedIn }: { children: React.ReactNode; signedIn: boolean }) {
  return (
    <main id="main" className="min-h-dvh bg-soi-canvas">
      <header className="mx-auto flex max-w-2xl items-center justify-between px-5 py-5">
        <Link href="/" className="press text-xl font-medium tracking-tight">SOI.</Link>
        <Link href={signedIn ? '/momentos' : '/login'} className={buttonClass('outline', 'sm')}>{signedIn ? 'Abrir SOI' : 'Entrar'}</Link>
      </header>
      <div className="mx-auto max-w-2xl px-5 pb-16">{children}</div>
    </main>
  );
}
