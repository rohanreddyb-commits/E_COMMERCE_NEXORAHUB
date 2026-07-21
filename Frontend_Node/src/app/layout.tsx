import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';

export const metadata: Metadata = {
  title: {
    default: 'AESTHETE | Neo-Luxury Editorial Fashion House',
    template: '%s | AESTHETE Paris & New York',
  },
  description: 'Architectural streetwear and heavyweight organic fleeces created with quiet luxury aesthetics and digital precision.',
  keywords: ['Luxury Fashion', 'Streetwear', 'Heavyweight Hoodie', 'Editorial Fashion', 'Aesthete'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen flex flex-col bg-surface text-on-surface selection:bg-secondary-container selection:text-on-secondary-container">
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <CartDrawer />
        <Footer />
      </body>
    </html>
  );
}
