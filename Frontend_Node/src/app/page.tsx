import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MOCK_PRODUCTS } from '@/data/mockData';
import { ProductCard } from '@/components/ui/ProductCard';

export default function HomePage() {
  const featuredProducts = MOCK_PRODUCTS;

  return (
    <div className="space-y-20 pb-20">
      
      {/* 1. Hero Section */}
      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden bg-primary text-on-primary">
        {/* Background Image Overlay */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity">
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=85"
            alt="Aesthete Editorial Campaign"
            fill
            priority
            className="object-cover object-top scale-105 animate-pulse duration-[10000ms]"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent z-1" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-8 text-center space-y-6 pt-12">
          
          <span className="inline-block px-4 py-1.5 bg-secondary-container text-on-secondary-container font-extrabold text-xs uppercase tracking-[0.25em] rounded-full shadow-lg">
            CAPSULE 04 • FALL / WINTER 2026
          </span>

          <h1 className="font-headline font-extrabold text-5xl sm:text-7xl lg:text-8xl tracking-tight leading-[0.95] max-w-5xl mx-auto uppercase">
            ARCHITECTURAL <span className="text-secondary-fixed-dim italic font-normal">MINIMALISM.</span>
          </h1>

          <p className="text-on-primary-container text-base sm:text-lg max-w-2xl mx-auto font-body font-normal leading-relaxed">
            Constructed from custom 500GSM double-faced organic fleeces and Japanese technical ripstop. Defined by negative space, raw hems, and laser precision.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/product/aesthete-essential-hoodie"
              className="w-full sm:w-auto px-10 py-4 bg-on-primary text-primary font-extrabold text-xs uppercase tracking-[0.2em] hover:bg-secondary-fixed-dim transition-all duration-300 rounded-md shadow-xl hover:scale-105"
            >
              DISCOVER HEAVYWEIGHT HOODIE
            </Link>
            <Link
              href="#collections"
              className="w-full sm:w-auto px-10 py-4 border border-on-primary/40 text-on-primary font-extrabold text-xs uppercase tracking-[0.2em] hover:bg-on-primary/10 transition-all duration-300 rounded-md"
            >
              EXPLORE LOOKBOOK
            </Link>
          </div>

        </div>
      </section>


      {/* 2. Featured Drops Section */}
      <section className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-10">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
              CURATED SELECTION
            </span>
            <h2 className="font-headline font-extrabold text-3xl sm:text-4xl text-primary tracking-tight">
              FEATURED DROPS
            </h2>
          </div>
          <Link
            href="/product/aesthete-essential-hoodie"
            className="text-xs font-extrabold tracking-widest text-primary uppercase hover:text-secondary-fixed-dim transition-colors flex items-center gap-1"
          >
            VIEW ALL PRODUCTS <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

      </section>


      {/* 3. Neo-Luxury Editorial Spotlight Banner */}
      <section className="bg-surface-container-low border-y border-outline-variant/30 py-20">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <div className="lg:col-span-6 relative aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl">
            <Image
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85"
              alt="Editorial Craftsmanship"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 text-on-primary">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase bg-primary/80 backdrop-blur-md px-3 py-1 rounded-full">
                CRAFT MANIFESTO
              </span>
              <h3 className="font-headline font-bold text-2xl mt-2">
                500GSM Custom Organic Fleece
              </h3>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs font-bold tracking-[0.2em] text-outline uppercase">
              DESIGN PHILOSOPHY
            </span>
            <h2 className="font-headline font-extrabold text-4xl sm:text-5xl text-primary tracking-tight leading-none">
              QUIET LUXURY WITH A DIGITAL PULSE.
            </h2>
            <p className="text-on-surface-variant text-base leading-relaxed">
              We reject transient fast-fashion trends in favor of structural weight, tactile luxury, and timeless proportions. Every seam is laser-bonded, every pocket magnetized, and every fleece pre-shrunk for an immutable silhouette.
            </p>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-outline-variant/30">
              <div>
                <h4 className="font-headline font-extrabold text-2xl text-primary">500GSM</h4>
                <p className="text-xs text-outline font-medium uppercase tracking-wider mt-1">Double-Faced Fleece</p>
              </div>
              <div>
                <h4 className="font-headline font-extrabold text-2xl text-primary">100% ORGANIC</h4>
                <p className="text-xs text-outline font-medium uppercase tracking-wider mt-1">GOTS Certified Cotton</p>
              </div>
            </div>

            <div className="pt-4">
              <Link
                href="/product/aesthete-essential-hoodie"
                className="inline-block px-8 py-4 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest hover:bg-primary-container transition-colors rounded-md shadow-lg"
              >
                SHOP THE ESSENTIAL HOODIE
              </Link>
            </div>
          </div>

        </div>
      </section>


      {/* 4. Category Showcase */}
      <section id="collections" className="max-w-[1440px] mx-auto px-4 sm:px-8 space-y-10">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
            CATEGORIES
          </span>
          <h2 className="font-headline font-extrabold text-3xl sm:text-4xl text-primary">
            EXPLORE THE ARCHIVE
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1 */}
          <div className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-primary text-on-primary">
            <Image
              src="https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80"
              alt="Heavyweight Outerwear"
              fill
              className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-secondary-fixed uppercase">CATEGORY 01</span>
              <h3 className="font-headline font-bold text-2xl">HEAVYWEIGHT FLEECE</h3>
              <Link
                href="/product/aesthete-essential-hoodie"
                className="inline-flex items-center text-xs font-bold tracking-widest text-on-primary group-hover:text-secondary-fixed-dim transition-colors pt-2"
              >
                EXPLORE FLEECE <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-primary text-on-primary">
            <Image
              src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80"
              alt="Structured Tailoring"
              fill
              className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-secondary-fixed uppercase">CATEGORY 02</span>
              <h3 className="font-headline font-bold text-2xl">TAILORING & BLAZERS</h3>
              <Link
                href="/product/aesthete-essential-hoodie"
                className="inline-flex items-center text-xs font-bold tracking-widest text-on-primary group-hover:text-secondary-fixed-dim transition-colors pt-2"
              >
                EXPLORE TAILORING <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Card 3 */}
          <div className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-primary text-on-primary">
            <Image
              src="https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=800&q=80"
              alt="Tactile Bottoms"
              fill
              className="object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 space-y-2">
              <span className="text-[10px] font-bold tracking-widest text-secondary-fixed uppercase">CATEGORY 03</span>
              <h3 className="font-headline font-bold text-2xl">TACTILE TROUSERS</h3>
              <Link
                href="/product/aesthete-essential-hoodie"
                className="inline-flex items-center text-xs font-bold tracking-widest text-on-primary group-hover:text-secondary-fixed-dim transition-colors pt-2"
              >
                EXPLORE TROUSERS <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span>
              </Link>
            </div>
          </div>

        </div>

      </section>

    </div>
  );
}
