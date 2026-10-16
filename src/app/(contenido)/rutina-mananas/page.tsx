import { GuidePage, guideMetadata } from '@/components/seo/guide-page';

/** Días de prueba del panel; la página se regenera cada 5 minutos. */
export const revalidate = 300;
export const metadata = guideMetadata('rutina-mananas');

export default function Page() {
  return <GuidePage slug="rutina-mananas" />;
}
