'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';

export const CartDrawer: React.FC = () => {
  const { items, isDrawerOpen, closeDrawer, removeItem, updateQuantity, getSubtotal, getTotalItems } = useCartStore();

  if (!isDrawerOpen) return null;

  const subtotal = getSubtotal();
  const totalItems = getTotalItems();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary/40 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      {/* Slide-over Panel */}
      <div className="relative w-full max-w-md bg-surface-container-lowest text-on-surface h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-headline font-bold text-lg tracking-tight">SHOPPING BAG</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-surface-container text-on-surface-variant rounded-full">
              {totalItems}
            </span>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1.5 text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container"
            aria-label="Close Bag"
          >
            <span className="material-symbols-outlined text-2xl">close</span>
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 divide-y divide-outline-variant/20">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
              <span className="material-symbols-outlined text-5xl text-outline">shopping_bag</span>
              <p className="text-sm font-semibold tracking-wider text-outline uppercase">
                YOUR BAG IS CURRENTLY EMPTY.
              </p>
              <button
                onClick={closeDrawer}
                className="mt-2 px-6 py-3 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors rounded-md"
              >
                DISCOVER COLLECTIONS
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="pt-4 first:pt-0 flex gap-4">
                {/* Item Image */}
                <div className="relative w-20 h-24 bg-surface-container rounded-md overflow-hidden shrink-0 border border-outline-variant/30">
                  <Image
                    src={item.product.images[0]}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Item Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-headline font-bold text-sm leading-snug text-primary">
                        {item.product.name}
                      </h4>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-outline hover:text-error transition-colors"
                        aria-label="Remove item"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-on-surface-variant font-medium tracking-wider mt-0.5">
                      COLOR: {item.selectedColor.name} | SIZE: {item.selectedSize}
                    </p>
                  </div>

                  {/* Quantity & Price */}
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center border border-outline-variant rounded-md overflow-hidden bg-surface">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="px-2 py-0.5 text-xs font-bold text-on-surface hover:bg-surface-container"
                      >
                        -
                      </button>
                      <span className="px-2.5 py-0.5 text-xs font-bold text-primary">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="px-2 py-0.5 text-xs font-bold text-on-surface hover:bg-surface-container"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-headline font-bold text-sm text-primary">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Subtotal & Checkout */}
        {items.length > 0 && (
          <div className="p-6 border-t border-outline-variant/30 bg-surface-container-low space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold tracking-wider uppercase text-on-surface-variant">SUBTOTAL</span>
              <span className="font-headline font-extrabold text-lg text-primary">
                ${subtotal.toFixed(2)} USD
              </span>
            </div>
            <p className="text-[11px] text-outline">
              Taxes and shipping calculated at checkout. Free shipping over $250.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <Link
                href="/cart"
                onClick={closeDrawer}
                className="w-full py-3.5 text-center bg-surface-container text-primary font-bold text-xs uppercase tracking-widest hover:bg-surface-container-high transition-colors rounded-md border border-outline-variant/50"
              >
                VIEW BAG
              </Link>
              <Link
                href="/checkout"
                onClick={closeDrawer}
                className="w-full py-3.5 text-center bg-primary text-on-primary font-bold text-xs uppercase tracking-widest hover:bg-primary-container transition-colors rounded-md shadow-md"
              >
                CHECKOUT
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
