import type { Metadata, Viewport } from 'next';
import { PERSONS_BRAND, PERSONS_TAGLINE } from '@/config/persons';

export const metadata: Metadata = {
  title: { default: PERSONS_BRAND, template: `%s · ${PERSONS_BRAND}` },
  description: PERSONS_TAGLINE,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#008069' };

export default function PersonsRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
