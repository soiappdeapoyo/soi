import { SeoShell } from '@/components/seo/site-footer';

/** Guías y blog: contenido público (SEO), sin sesión ni la navegación de la app. */
export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return <SeoShell>{children}</SeoShell>;
}
