import { AuthorPage, authorMetadata } from '@/components/seo/author-page';

/** Días de prueba del panel; la página se regenera cada 5 minutos. */
export const revalidate = 300;
export const metadata = authorMetadata('james-clear');

export default function Page() {
  return <AuthorPage slug="james-clear" />;
}
