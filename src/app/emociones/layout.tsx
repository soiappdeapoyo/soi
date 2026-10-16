import { SeoShell } from '@/components/seo/site-footer';

/** Hub público de contenido (SEO): sin sesión, sin la navegación de la app. */
export default function EmotionsLayout({ children }: { children: React.ReactNode }) {
  return <SeoShell>{children}</SeoShell>;
}
