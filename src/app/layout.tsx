import type { Metadata, Viewport } from 'next';
import { appUrl } from '@/lib/utils';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'sonner';
import { AnalyticsProvider } from '@/components/providers/analytics';
import { ServiceWorkerRegister } from '@/components/providers/sw-register';
import './globals.css';

const url = appUrl();

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

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FFFFFF' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-dvh antialiased">
        {children}
        {/* Sonner: apilado con escala progresiva, entrada desde el borde, salida por swipe. */}
        <Toaster
          position="bottom-center"
          mobileOffset={{ bottom: 'calc(5.25rem + env(safe-area-inset-bottom))' }}
          duration={3500}
          toastOptions={{ className: 'rounded-xl! shadow-raised! border-0! font-sans! text-soi-ink!' }}
        />
        <AnalyticsProvider />
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  );
}
