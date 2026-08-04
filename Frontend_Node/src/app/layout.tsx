import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { AppProviders } from '@/components/providers/AppProviders';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export const metadata: Metadata = {
  title: {
    default: 'AESTHETE | Neo-Luxury Editorial Fashion House',
    template: '%s | AESTHETE Paris & New York',
  },
  description:
    'Architectural streetwear and heavyweight organic fleeces created with quiet luxury aesthetics and digital precision.',
  keywords: ['Luxury Fashion', 'Streetwear', 'Heavyweight Hoodie', 'Editorial Fashion', 'Aesthete'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="flex min-h-screen flex-col bg-surface text-on-surface selection:bg-secondary-container selection:text-on-secondary-container">
        <AppProviders>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-on-primary"
          >
            Skip to content
          </a>

          <Navbar />

          <main id="main-content" className="flex-1">
            <ErrorBoundary>{children}</ErrorBoundary>
          </main>

          <CartDrawer />
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
