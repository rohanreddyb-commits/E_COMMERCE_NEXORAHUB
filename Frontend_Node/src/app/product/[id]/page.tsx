'use client';

import React, { useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MOCK_PRODUCTS } from '@/data/mockData';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { AccordionItem } from '@/components/ui/Accordion';
import { ProductCard } from '@/components/ui/ProductCard';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;

  // Find product by id or slug or fallback to default hoodie
  const product = MOCK_PRODUCTS.find(
    (p) => p.id === productId || p.slug === productId
  ) || MOCK_PRODUCTS[0];

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);
  const [selectedSize, setSelectedSize] = useState(product.sizes[2] || product.sizes[0]);
  const [quantity, setQuantity] = useState(1);
  const [isAddedSuccess, setIsAddedSuccess] = useState(false);
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);

  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const isWishlisted = isInWishlist(product.id);

  const handleAddToCart = () => {
    addItem(product, selectedColor, selectedSize, quantity);
    setIsAddedSuccess(true);
    setTimeout(() => setIsAddedSuccess(false), 2500);
  };

  const relatedProducts = MOCK_PRODUCTS.filter((p) => p.id !== product.id);

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-16">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-xs font-semibold text-outline uppercase tracking-wider">
        <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        <span>/</span>
        <Link href="/" className="hover:text-primary transition-colors">{product.category}</Link>
        <span>/</span>
        <span className="text-primary font-bold">{product.name}</span>
      </nav>

      {/* Main Product Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: Multi-Angle Gallery Grid */}
        <div className="lg:col-span-7 space-y-4">
          {/* Main Large Image */}
          <div className="relative aspect-[3/4] w-full bg-surface-container rounded-2xl overflow-hidden border border-outline-variant/30 shadow-sm">
            <Image
              src={product.images[selectedImage] || product.images[0]}
              alt={`${product.name} View ${selectedImage + 1}`}
              fill
              priority
              className="object-cover transition-opacity duration-300"
            />
            {product.badge && (
              <span className="absolute top-4 left-4 px-3 py-1 bg-primary text-on-primary font-extrabold text-[10px] uppercase tracking-widest rounded-md shadow-md">
                {product.badge}
              </span>
            )}
          </div>

          {/* Thumbnail Strip */}
          <div className="grid grid-cols-4 gap-4">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImage(idx)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                  selectedImage === idx
                    ? 'border-primary ring-2 ring-primary/20 scale-95'
                    : 'border-outline-variant/40 opacity-70 hover:opacity-100'
                }`}
              >
                <Image
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        </div>


        {/* Right Column: Buying Details & Specs */}
        <div className="lg:col-span-5 space-y-8 sticky top-28">
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-1 bg-secondary-container text-on-secondary-container font-extrabold text-[10px] uppercase tracking-widest rounded-md">
                {product.tag || 'EDITORIAL EXCLUSIVE'}
              </span>
              <button
                onClick={() => toggleWishlist(product)}
                className="flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-error transition-colors"
              >
                <span className={`material-symbols-outlined text-xl ${isWishlisted ? 'fill text-error' : ''}`}>
                  favorite
                </span>
                <span>{isWishlisted ? 'WISHLISTED' : 'SAVE TO WISHLIST'}</span>
              </button>
            </div>

            <h1 className="font-headline font-extrabold text-3xl sm:text-4xl text-primary tracking-tight leading-tight uppercase">
              {product.name}
            </h1>

            <p className="text-xs text-on-surface-variant font-medium tracking-wide">
              {product.subtitle}
            </p>

            <div className="flex items-baseline gap-3 pt-2">
              <span className="font-headline font-extrabold text-3xl text-primary">
                ${product.price.toFixed(2)} USD
              </span>
              {product.originalPrice && (
                <span className="text-sm text-outline line-through font-semibold">
                  ${product.originalPrice.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          <hr className="border-outline-variant/30" />

          {/* Color Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold tracking-widest uppercase text-primary">COLOR:</span>
              <span className="font-semibold text-on-surface-variant">{selectedColor.name}</span>
            </div>
            <div className="flex items-center space-x-3">
              {product.colors.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  className={`w-9 h-9 rounded-full border-2 p-0.5 transition-all flex items-center justify-center ${
                    selectedColor.name === color.name
                      ? 'border-primary ring-2 ring-primary/20 scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  title={color.name}
                >
                  <span
                    className="w-full h-full rounded-full border border-outline-variant/50"
                    style={{ backgroundColor: color.hex }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Size Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold tracking-widest uppercase text-primary">SIZE:</span>
              <button
                onClick={() => setIsSizeGuideOpen(true)}
                className="font-bold tracking-wider text-outline hover:text-primary transition-colors underline"
              >
                SIZE GUIDE
              </button>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {product.sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSize(size)}
                  className={`py-3 text-xs font-extrabold rounded-lg border transition-all ${
                    selectedSize === size
                      ? 'bg-primary text-on-primary border-primary shadow-md'
                      : 'bg-surface text-on-surface border-outline-variant/50 hover:border-primary'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Add to Cart */}
          <div className="space-y-4 pt-2">
            <div className="flex gap-3">
              {/* Quantity Picker */}
              <div className="flex items-center border border-outline-variant rounded-lg bg-surface px-2">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-3 text-sm font-bold text-on-surface hover:bg-surface-container rounded-md"
                >
                  -
                </button>
                <span className="px-4 text-sm font-extrabold text-primary">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-3 text-sm font-bold text-on-surface hover:bg-surface-container rounded-md"
                >
                  +
                </button>
              </div>

              {/* Main CTA */}
              <button
                onClick={handleAddToCart}
                className={`flex-1 py-4 px-6 text-xs font-extrabold uppercase tracking-[0.2em] rounded-lg transition-all shadow-xl flex items-center justify-center gap-2 ${
                  isAddedSuccess
                    ? 'bg-secondary-container text-on-secondary-container scale-102'
                    : 'bg-primary text-on-primary hover:bg-primary-container active:scale-98'
                }`}
              >
                <span className="material-symbols-outlined text-lg">
                  {isAddedSuccess ? 'check_circle' : 'shopping_bag'}
                </span>
                {isAddedSuccess ? 'ADDED TO BAG ✓' : `ADD TO BAG • $${(product.price * quantity).toFixed(2)}`}
              </button>
            </div>

            <p className="text-[11px] text-center text-outline font-medium">
              ⚡ In Stock. Ships within 24 hours with complimentary express delivery.
            </p>
          </div>

          <hr className="border-outline-variant/30" />

          {/* Accordion Specification Breakdown */}
          <div className="space-y-1">
            {product.specs.map((spec, idx) => (
              <AccordionItem key={spec.title} title={spec.title} defaultOpen={idx === 0}>
                <p>{spec.content}</p>
              </AccordionItem>
            ))}
          </div>

        </div>

      </div>

      {/* Related Editorial Drops */}
      <section className="pt-12 border-t border-outline-variant/30 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-extrabold text-2xl text-primary tracking-tight">
            RECOMMENDED PAIRINGS
          </h2>
          <span className="text-xs font-semibold text-outline uppercase tracking-wider">
            CAPSULE 04
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {relatedProducts.slice(0, 3).map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      </section>

      {/* Size Guide Modal */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-primary/50 backdrop-blur-sm" onClick={() => setIsSizeGuideOpen(false)} />
          <div className="relative bg-surface-container-lowest text-on-surface rounded-2xl p-6 max-w-lg w-full z-10 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-headline font-bold text-lg">AESTHETE GARMENT SIZE GUIDE</h3>
              <button onClick={() => setIsSizeGuideOpen(false)} className="text-outline hover:text-primary">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="text-xs space-y-3 leading-relaxed">
              <p>All garments are engineered with custom relaxed boxy cuts. Measure around the fullest part of your chest for optimal fit.</p>
              <table className="w-full text-left border-collapse mt-2">
                <thead>
                  <tr className="border-b font-bold bg-surface-container">
                    <th className="p-2">SIZE</th>
                    <th className="p-2">CHEST (INCHES)</th>
                    <th className="p-2">LENGTH (INCHES)</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-on-surface-variant">
                  <tr><td className="p-2 font-bold">S</td><td className="p-2">38 - 40</td><td className="p-2">27.5</td></tr>
                  <tr><td className="p-2 font-bold">M</td><td className="p-2">41 - 43</td><td className="p-2">28.5</td></tr>
                  <tr><td className="p-2 font-bold">L</td><td className="p-2">44 - 46</td><td className="p-2">29.5</td></tr>
                  <tr><td className="p-2 font-bold">XL</td><td className="p-2">47 - 49</td><td className="p-2">30.5</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
