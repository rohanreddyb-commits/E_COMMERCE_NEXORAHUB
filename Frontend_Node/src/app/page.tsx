'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { catalogService, productService, recommendationService } from '@/services';
import { useApiResource } from '@/hooks/useApiResource';
import { useAuth } from '@/context/AuthContext';
import { getImageUrl } from '@/lib/format';
import { ProductSection } from '@/components/product/ProductSection';
import { Skeleton } from '@/components/ui/Feedback';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  const featured = useApiResource((signal) => productService.featured(signal), []);
  const newArrivals = useApiResource((signal) => productService.newArrivals(signal), []);
  const bestSellers = useApiResource((signal) => productService.bestSellers(signal), []);
  const categories = useApiResource((signal) => catalogService.categories(signal), []);

  const recommended = useApiResource(
    (signal) => recommendationService.personalized(signal),
    [isAuthenticated],
    { enabled: isAuthenticated }
  );

  const recentlyViewed = useApiResource(
    (signal) => productService.recentlyViewed(signal),
    [isAuthenticated],
    { enabled: isAuthenticated }
  );

  const showcaseCategories = (categories.data ?? []).slice(0, 3);

  return (
    <div className="space-y-20 pb-20">
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-primary text-on-primary">
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-luminosity">
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=85"
            alt=""
            fill
            priority
            className="scale-105 object-cover object-top"
          />
        </div>
        <div className="z-1 absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent" />

        <div className="relative z-10 mx-auto max-w-[1440px] space-y-6 px-4 pt-12 text-center sm:px-8">
          <span className="inline-block rounded-full bg-secondary-container px-4 py-1.5 text-xs font-extrabold uppercase tracking-[0.25em] text-on-secondary-container shadow-lg">
            Capsule 04 • Fall / Winter 2026
          </span>

          <h1 className="mx-auto max-w-5xl font-headline text-5xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-7xl lg:text-8xl">
            Architectural{' '}
            <span className="font-normal italic text-secondary-fixed-dim">Minimalism.</span>
          </h1>

          <p className="mx-auto max-w-2xl font-body text-base font-normal leading-relaxed text-on-primary-container sm:text-lg">
            Constructed from custom 500GSM double-faced organic fleeces and Japanese technical
            ripstop. Defined by negative space, raw hems, and laser precision.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
            <Link
              href="/products"
              className="w-full rounded-md bg-on-primary px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-primary shadow-xl transition-all duration-300 hover:scale-105 hover:bg-secondary-fixed-dim sm:w-auto"
            >
              Shop the Collection
            </Link>
            <Link
              href="/products?onSale=true"
              className="w-full rounded-md border border-on-primary/40 px-10 py-4 text-xs font-extrabold uppercase tracking-[0.2em] text-on-primary transition-all duration-300 hover:bg-on-primary/10 sm:w-auto"
            >
              View Offers
            </Link>
          </div>
        </div>
      </section>

      <ProductSection
        eyebrow="Curated Selection"
        title="Featured Drops"
        products={featured.data}
        loading={featured.loading}
        error={featured.error}
        onRetry={featured.reload}
        viewAllHref="/products?featured=true"
      />

      {isAuthenticated && (
        <ProductSection
          eyebrow="Chosen for you"
          title="Recommended"
          products={recommended.data}
          loading={recommended.loading}
          error={recommended.error}
          onRetry={recommended.reload}
          hideWhenEmpty
        />
      )}

      <ProductSection
        eyebrow="Just landed"
        title="New Arrivals"
        products={newArrivals.data}
        loading={newArrivals.loading}
        error={newArrivals.error}
        onRetry={newArrivals.reload}
        viewAllHref="/products?sort=created_at&order=DESC"
      />

      {/* Editorial spotlight */}
      <section className="border-y border-outline-variant/30 bg-surface-container-low py-20">
        <div className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-4 sm:px-8 lg:grid-cols-12">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl lg:col-span-6">
            <Image
              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85"
              alt="Editorial craftsmanship"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
            <div className="absolute inset-x-6 bottom-6 text-on-primary">
              <span className="rounded-full bg-primary/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md">
                Craft Manifesto
              </span>
              <h3 className="mt-2 font-headline text-2xl font-bold">
                500GSM Custom Organic Fleece
              </h3>
            </div>
          </div>

          <div className="space-y-6 lg:col-span-6">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
              Design Philosophy
            </span>
            <h2 className="font-headline text-4xl font-extrabold leading-none tracking-tight text-primary sm:text-5xl">
              Quiet luxury with a digital pulse.
            </h2>
            <p className="text-base leading-relaxed text-on-surface-variant">
              We reject transient fast-fashion trends in favour of structural weight, tactile
              luxury, and timeless proportions. Every seam is laser-bonded, every pocket
              magnetised, and every fleece pre-shrunk for an immutable silhouette.
            </p>

            <div className="grid grid-cols-2 gap-6 border-t border-outline-variant/30 pt-4">
              <div>
                <h4 className="font-headline text-2xl font-extrabold text-primary">500GSM</h4>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-outline">
                  Double-faced fleece
                </p>
              </div>
              <div>
                <h4 className="font-headline text-2xl font-extrabold text-primary">100% Organic</h4>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-outline">
                  GOTS certified cotton
                </p>
              </div>
            </div>

            <Link
              href="/products"
              className="inline-block rounded-md bg-primary px-8 py-4 text-xs font-bold uppercase tracking-widest text-on-primary shadow-lg transition-colors hover:bg-primary-container"
            >
              Explore the Archive
            </Link>
          </div>
        </div>
      </section>

      <ProductSection
        eyebrow="Most wanted"
        title="Best Sellers"
        products={bestSellers.data}
        loading={bestSellers.loading}
        error={bestSellers.error}
        onRetry={bestSellers.reload}
        hideWhenEmpty
      />

      {/* Categories, driven by the live catalogue */}
      <section id="collections" className="mx-auto max-w-[1440px] space-y-10 px-4 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-2 text-center">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">
            Categories
          </span>
          <h2 className="font-headline text-3xl font-extrabold text-primary sm:text-4xl">
            Explore the Archive
          </h2>
        </div>

        {categories.loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="aspect-[3/4] rounded-xl" />
            ))}
          </div>
        ) : showcaseCategories.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {showcaseCategories.map((category, index) => (
              <Link
                key={category.category_id}
                href={`/products?category=${category.category_id}`}
                className="group relative aspect-[3/4] overflow-hidden rounded-xl bg-primary text-on-primary"
              >
                <Image
                  src={getImageUrl(category.image_url)}
                  alt={category.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/20 to-transparent" />
                <div className="absolute inset-x-6 bottom-6 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-secondary-fixed">
                    Category {String(index + 1).padStart(2, '0')}
                  </span>
                  <h3 className="font-headline text-2xl font-bold uppercase">{category.name}</h3>
                  <span className="inline-flex items-center pt-2 text-xs font-bold tracking-widest text-on-primary transition-colors group-hover:text-secondary-fixed-dim">
                    Explore
                    <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-on-surface-variant">
            Categories are being curated. Meanwhile,{' '}
            <Link href="/products" className="font-semibold text-primary underline">
              browse everything
            </Link>
            .
          </p>
        )}
      </section>

      {isAuthenticated && (
        <ProductSection
          eyebrow="Pick up where you left off"
          title="Recently Viewed"
          products={recentlyViewed.data}
          loading={recentlyViewed.loading}
          error={recentlyViewed.error}
          onRetry={recentlyViewed.reload}
          hideWhenEmpty
        />
      )}
    </div>
  );
}
