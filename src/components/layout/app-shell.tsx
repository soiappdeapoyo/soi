import { SidebarContent, type SidebarData } from './sidebar-content';
import { MobileNav } from './mobile-nav';

/**
 * Desktop ≥1024: sidebar 280px · Tablet 768-1023: sidebar colapsado (72px, solo iconos) · Mobile <768: drawer (Vaul).
 */
export function AppShell({ data, children }: { data: SidebarData; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-soi-canvas md:flex">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-raised">
        Saltar al contenido
      </a>
      <MobileNav data={data} />
      <aside className="sticky top-0 hidden h-dvh shrink-0 bg-soi-sidebar shadow-[1px_0_0_rgb(0_0_0/0.05)] md:block md:w-[72px] lg:w-[280px]" aria-label="Barra lateral">
        <div className="h-full lg:hidden"><SidebarContent data={data} compact /></div>
        <div className="hidden h-full lg:block"><SidebarContent data={data} /></div>
      </aside>
      <main id="main" className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
