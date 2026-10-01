import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { AnalyticsProvider } from '@/components/providers/analytics';
import { ServiceWorkerRegister } from '@/components/providers/sw-register';
import './globals.css';

const url = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(url),
  title: { default: 'SOI — Diseña tu identidad. Vive tu propósito.', template: '%s · SOI' },
  description: 'Sistema de transformación personal con IA: pensamientos → emociones → acciones → resultados. Rutinas de Brian Tracy, Hal Elrod, Robin Sharma, Joe Dispenza y Neville Goddard.',
  applicationName: 'SOI',
  keywords: ['manifestación', 'afirmaciones', 'meditación', 'Miracle Morning', 'Club de las 5 AM', 'Neville Goddard', 'Joe Dispenza', 'bienestar'],
  openGraph: { type: 'website', locale: 'es_MX', siteName: 'SOI', url },
  twitter: { card: 'summary_large_image' },
  appleWebApp: { capable: true, title: 'SOI', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1A1A2E' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">
        {children}
        <AnalyticsProvider />
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
