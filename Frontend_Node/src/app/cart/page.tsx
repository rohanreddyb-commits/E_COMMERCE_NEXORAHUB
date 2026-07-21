'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getSubtotal, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-widest text-outline">LOADING BAG...</p>
      </div>
    );
  }

  const rawSubtotal = getSubtotal();
  const discountAmount = (rawSubtotal * discountPercent) / 100;
  const subtotal = rawSubtotal - discountAmount;
  const freeShippingThreshold = 250;
  const remainingForFreeShipping = Math.max(0, freeShippingThreshold - rawSubtotal);
  const shippingFee = rawSubtotal >= freeShippingThreshold || rawSubtotal === 0 ? 0 : 15.00;
  const estimatedTax = subtotal * 0.08;
  const grandTotal = subtotal + shippingFee + estimatedTax;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'AESTHETE10') {
      setDiscountPercent(10);
      setPromoSuccess('10% EDITORIAL DISCOUNT APPLIED');
      setPromoError('');
    } else if (promoCode.trim().toUpperCase() === 'VIP20') {
      setDiscountPercent(20);
      setPromoSuccess('20% VIP MEMBER DISCOUNT APPLIED');
      setPromoError('');
    } else {
      setPromoError('INVALID PROMO CODE. TRY "AESTHETE10" OR "VIP20"');
      setPromoSuccess('');
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 space-y-12">
      
      {/* Page Header */}
      <div className="border-b border-outline-variant/30 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">YOUR SELECTION</span>
          <h1 className="font-headline font-extrabold text-4xl sm:text-5xl text-primary tracking-tight">
            SHOPPING BAG ({items.reduce((acc, i) => acc + i.quantity, 0)})
          </h1>
        </div>
        <Link
          href="/"
          className="text-xs font-bold uppercase tracking-widest text-outline hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span> CONTINUE SHOPPING
        </Link>
      </div>

      {/* Free Shipping Progress Indicator */}
      {rawSubtotal > 0 && (
        <div className="p-4 bg-surface-container-lowest border border-outline-variant/40 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="text-primary flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-secondary-fixed-dim">local_shipping</span>
              {remainingForFreeShipping === 0 ? (
                <span className="text-secondary-fixed-dim">YOU HAVE UNLOCKED COMPLIMENTARY EXPRESS SHIPPING!</span>
              ) : (
                <span>ADD ${remainingForFreeShipping.toFixed(2)} MORE FOR FREE EXPRESS SHIPPING</span>
              )}
            </span>
            <span className="text-outline">TARGET: $250.00</span>
          </div>
          <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, (rawSubtotal / freeShippingThreshold) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Main Content Layout */}
      {items.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-16 text-center space-y-6 max-w-2xl mx-auto shadow-sm">
          <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto text-outline">
            <span className="material-symbols-outlined text-4xl">shopping_bag</span>
          </div>
          <div className="space-y-2">
            <h2 className="font-headline font-extrabold text-2xl text-primary">YOUR BAG IS EMPTY</h2>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto">
              Discover our latest heavyweights, double-breasted tailoring, and tactile technical trousers.
            </p>
          </div>
          <Link
            href="/product/aesthete-essential-hoodie"
            className="inline-block px-8 py-4 bg-primary text-on-primary font-bold text-xs uppercase tracking-[0.2em] hover:bg-primary-container transition-colors rounded-md shadow-lg"
          >
            DISCOVER THE HEAVYWEIGHT HOODIE
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Column: Line Items List */}
          <div className="lg:col-span-8 space-y-6">
            
            <div className="divide-y divide-outline-variant/30 border-t border-b border-outline-variant/30">
              {items.map((item) => (
                <div key={item.id} className="py-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                  
                  {/* Item Image */}
                  <Link href={`/product/${item.product.slug}`} className="relative w-28 h-36 bg-surface-container rounded-xl overflow-hidden shrink-0 border border-outline-variant/30">
                    <Image
                      src={item.product.images[0]}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                    />
                  </Link>

                  {/* Item Details */}
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold tracking-widest text-outline uppercase">
                          {item.product.category}
                        </span>
                        <h3 className="font-headline font-bold text-lg text-primary">
                          <Link href={`/product/${item.product.slug}`} className="hover:underline">
                            {item.product.name}
                          </Link>
                        </h3>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-outline hover:text-error transition-colors"
                        title="Remove item"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-on-surface-variant">
                      <span>COLOR: <strong className="text-primary">{item.selectedColor.name}</strong></span>
                      <span>•</span>
                      <span>SIZE: <strong className="text-primary">{item.selectedSize}</strong></span>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      {/* Quantity Modifier */}
                      <div className="flex items-center border border-outline-variant rounded-lg bg-surface px-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="px-3 py-1 text-xs font-extrabold text-on-surface hover:bg-surface-container rounded"
                        >
                          -
                        </button>
                        <span className="px-3 text-xs font-extrabold text-primary">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-3 py-1 text-xs font-extrabold text-on-surface hover:bg-surface-container rounded"
                        >
                          +
                        </button>
                      </div>

                      {/* Total Item Price */}
                      <div className="text-right">
                        <span className="font-headline font-extrabold text-lg text-primary">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </span>
                        {item.quantity > 1 && (
                          <p className="text-[10px] text-outline font-medium">
                            (${item.product.price.toFixed(2)} each)
                          </p>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              ))}
            </div>

            {/* Clear Cart & Promo Input Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
              <button
                onClick={clearCart}
                className="text-xs font-bold uppercase tracking-widest text-outline hover:text-error transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">remove_shopping_cart</span> CLEAR SHOPPING BAG
              </button>

              <form onSubmit={handleApplyPromo} className="w-full sm:w-auto flex items-center gap-2">
                <input
                  type="text"
                  placeholder="PROMO CODE (e.g. AESTHETE10)"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  className="px-4 py-2.5 bg-surface border border-outline-variant text-xs text-on-surface uppercase tracking-wider rounded-lg focus:outline-none focus:border-primary placeholder:text-outline w-full sm:w-64"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-primary-container transition-colors rounded-lg shrink-0"
                >
                  APPLY
                </button>
              </form>
            </div>

            {promoError && <p className="text-xs text-error font-semibold">{promoError}</p>}
            {promoSuccess && <p className="text-xs text-secondary-container font-semibold">{promoSuccess}</p>}

          </div>

          {/* Right Column: Order Summary Card */}
          <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 space-y-6 shadow-md sticky top-28">
            <h2 className="font-headline font-extrabold text-xl text-primary tracking-tight">
              ORDER SUMMARY
            </h2>

            <div className="space-y-3 text-xs border-b border-outline-variant/30 pb-4">
              <div className="flex justify-between text-on-surface-variant">
                <span>Bag Subtotal</span>
                <span className="font-bold text-primary">${rawSubtotal.toFixed(2)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-secondary-container font-bold">
                  <span>Promo Discount ({discountPercent}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-on-surface-variant">
                <span>Estimated Express Shipping</span>
                <span className="font-bold text-primary">
                  {shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`}
                </span>
              </div>

              <div className="flex justify-between text-on-surface-variant">
                <span>Estimated Sales Tax (8%)</span>
                <span className="font-bold text-primary">${estimatedTax.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="font-headline font-extrabold uppercase text-primary">ESTIMATED TOTAL</span>
              <span className="font-headline font-extrabold text-2xl text-primary">
                ${grandTotal.toFixed(2)} USD
              </span>
            </div>

            <Link
              href="/checkout"
              className="block w-full py-4 text-center bg-primary text-on-primary font-extrabold text-xs uppercase tracking-[0.2em] hover:bg-primary-container transition-colors rounded-xl shadow-xl active:scale-98"
            >
              PROCEED TO CHECKOUT
            </Link>

            {/* Trust Badges */}
            <div className="space-y-3 pt-4 border-t border-outline-variant/30 text-[11px] text-outline font-medium">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">lock</span>
                <span>256-Bit Encrypted Secure Checkout</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">published_with_changes</span>
                <span>30-Day Complimentary Global Returns</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-primary">eco</span>
                <span>100% Carbon Neutral Express Delivery</span>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
