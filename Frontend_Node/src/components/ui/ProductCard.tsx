'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/types';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCartStore();
  const { toggleWishlist, isInWishlist } = useWishlistStore();
  const isWishlisted = isInWishlist(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, product.colors[0], product.sizes[0], 1);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div className="group relative flex flex-col bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
      {/* Product Image Container */}
      <Link href={`/product/${product.slug}`} className="relative aspect-[3/4] w-full bg-surface-container overflow-hidden">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Secondary Image on Hover */}
        {product.images[1] && (
          <Image
            src={product.images[1]}
            alt={`${product.name} view 2`}
            fill
            className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out"
          />
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.badge && (
            <span className="px-2.5 py-1 bg-primary text-on-primary font-bold text-[10px] uppercase tracking-widest rounded-md shadow-sm">
              {product.badge}
            </span>
          )}
          {product.tag && (
            <span className="px-2.5 py-1 bg-secondary-container text-on-secondary-container font-extrabold text-[9px] uppercase tracking-widest rounded-md">
              {product.tag}
            </span>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className="absolute top-3 right-3 p-2 bg-surface-container-lowest/80 backdrop-blur-md text-on-surface hover:text-error transition-colors rounded-full shadow-md z-10"
          aria-label="Add to Wishlist"
        >
          <span className={`material-symbols-outlined text-lg ${isWishlisted ? 'fill text-error' : ''}`}>
            favorite
          </span>
        </button>

        {/* Quick Add Hover Bar */}
        <div className="absolute inset-x-3 bottom-3 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10">
          <button
            onClick={handleQuickAdd}
            className="w-full py-3 bg-primary/95 hover:bg-primary text-on-primary font-bold text-xs uppercase tracking-widest backdrop-blur-sm rounded-lg shadow-lg transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">shopping_bag</span>
            QUICK ADD TO BAG
          </button>
        </div>
      </Link>

      {/* Product Content Details */}
      <div className="p-4 flex flex-col justify-between flex-1 space-y-2">
        <div>
          <span className="text-[10px] font-bold tracking-widest text-outline uppercase">
            {product.category}
          </span>
          <Link href={`/product/${product.slug}`}>
            <h3 className="font-headline font-bold text-base text-primary group-hover:text-secondary-fixed-dim transition-colors line-clamp-1">
              {product.name}
            </h3>
          </Link>
          <p className="text-xs text-on-surface-variant line-clamp-1 font-medium mt-0.5">
            {product.subtitle}
          </p>
        </div>

        {/* Color Dots & Price */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
          <div className="flex items-center space-x-1.5">
            {product.colors.map((color) => (
              <span
                key={color.name}
                className="w-3.5 h-3.5 rounded-full border border-outline-variant/50 shadow-inner"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
          </div>

          <div className="flex items-baseline gap-1.5">
            {product.originalPrice && (
              <span className="text-xs text-outline line-through">
                ${product.originalPrice.toFixed(2)}
              </span>
            )}
            <span className="font-headline font-bold text-sm text-primary">
              ${product.price.toFixed(2)}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
