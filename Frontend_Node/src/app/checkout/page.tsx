'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';

export default function CheckoutPage() {
  const { items, getSubtotal, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOrderPlaced, setIsOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Form State
  const [email, setEmail] = useState('j.thorne@aesthete.design');
  const [firstName, setFirstName] = useState('Julian');
  const [lastName, setLastName] = useState('Thorne');
  const [street, setStreet] = useState('742 Mercer Street');
  const [apartment, setApartment] = useState('Suite 4B');
  const [city, setCity] = useState('New York');
  const [state, setState] = useState('NY');
  const [zipCode, setZipCode] = useState('10012');
  const [country, setCountry] = useState('United States');
  const [shippingMethod, setShippingMethod] = useState<'express' | 'nextday'>('express');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('888');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold uppercase tracking-widest text-outline">INITIALIZING CHECKOUT...</p>
      </div>
    );
  }

  const subtotal = getSubtotal();
  const shippingFee = shippingMethod === 'nextday' ? 25.00 : 0.00;
  const tax = subtotal * 0.08;
  const total = subtotal + shippingFee + tax;

  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    setTimeout(() => {
      const generatedOrderNum = `AES-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      setOrderNumber(generatedOrderNum);
      setIsSubmitting(false);
      setIsOrderPlaced(true);
      clearCart();
    }, 1500);
  };

  if (isOrderPlaced) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-8">
        <div className="w-24 h-24 bg-secondary-container text-on-secondary-container rounded-full flex items-center justify-center mx-auto shadow-xl">
          <span className="material-symbols-outlined text-5xl">check_circle</span>
        </div>

        <div className="space-y-3">
          <span className="text-xs font-extrabold tracking-[0.25em] text-outline uppercase">
            ORDER CONFIRMED
          </span>
          <h1 className="font-headline font-extrabold text-4xl sm:text-5xl text-primary">
            THANK YOU FOR YOUR ORDER.
          </h1>
          <p className="text-sm text-on-surface-variant font-medium">
            Order reference number: <strong className="text-primary font-mono">{orderNumber}</strong>
          </p>
          <p className="text-xs text-outline max-w-md mx-auto">
            A confirmation receipt and tracking details have been sent to <strong>{email}</strong>.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/profile"
            className="w-full sm:w-auto px-8 py-4 bg-primary text-on-primary font-extrabold text-xs uppercase tracking-widest hover:bg-primary-container transition-colors rounded-md shadow-lg"
          >
            VIEW ORDER IN DASHBOARD
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto px-8 py-4 border border-outline-variant text-primary font-bold text-xs uppercase tracking-widest hover:bg-surface-container transition-colors rounded-md"
          >
            RETURN TO HOMEPAGE
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 space-y-12">
      
      {/* Checkout Breadcrumbs */}
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-outline">SECURE CHECKOUT</span>
          <h1 className="font-headline font-extrabold text-4xl text-primary">SHIPPING & PAYMENT</h1>
        </div>
        <Link href="/cart" className="text-xs font-bold uppercase tracking-widest text-outline hover:text-primary">
          ← BACK TO BAG
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        {/* Left Column: Express Pay & Form Inputs */}
        <form onSubmit={handlePlaceOrder} className="lg:col-span-7 space-y-10">
          
          {/* Express Checkout Options */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 space-y-4 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-widest text-outline block text-center">
              EXPRESS CHECKOUT
            </span>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                className="py-3 bg-black text-white font-extrabold text-xs tracking-wider rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1"
              >
                Pay
              </button>
              <button
                type="button"
                className="py-3 bg-[#5A31F4] text-white font-extrabold text-xs tracking-wider rounded-lg hover:opacity-90 transition-opacity"
              >
                ShopPay
              </button>
              <button
                type="button"
                className="py-3 bg-[#FFC439] text-black font-extrabold text-xs tracking-wider rounded-lg hover:opacity-90 transition-opacity"
              >
                G Pay
              </button>
            </div>
            <div className="relative text-center">
              <hr className="border-outline-variant/30" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-surface-container-lowest px-4 text-[10px] font-bold text-outline uppercase tracking-widest">
                OR CONTINUE WITH STANDARD CHECKOUT
              </span>
            </div>
          </div>

          {/* Contact & Shipping Address */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 space-y-6 shadow-sm">
            <h2 className="font-headline font-extrabold text-xl text-primary tracking-tight">
              1. SHIPPING DETAILS
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-outline mb-1">
                  EMAIL ADDRESS (FOR TRACKING)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">FIRST NAME</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">LAST NAME</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-outline mb-1">STREET ADDRESS</label>
                <input
                  type="text"
                  required
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">CITY</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">STATE</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">POSTAL CODE</label>
                  <input
                    type="text"
                    required
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-medium"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Delivery Options */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 space-y-4 shadow-sm">
            <h2 className="font-headline font-extrabold text-xl text-primary tracking-tight">
              2. DELIVERY SPEED
            </h2>

            <div className="space-y-3">
              <label
                onClick={() => setShippingMethod('express')}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  shippingMethod === 'express'
                    ? 'border-primary bg-surface-container-low shadow-sm'
                    : 'border-outline-variant/40 hover:border-outline'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'express'}
                    onChange={() => setShippingMethod('express')}
                    className="accent-primary"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-primary uppercase">COMPLIMENTARY EXPRESS DELIVERY</h4>
                    <p className="text-[11px] text-outline">1 - 2 Business Days via DHL Express</p>
                  </div>
                </div>
                <span className="font-headline font-bold text-xs text-primary">FREE</span>
              </label>

              <label
                onClick={() => setShippingMethod('nextday')}
                className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  shippingMethod === 'nextday'
                    ? 'border-primary bg-surface-container-low shadow-sm'
                    : 'border-outline-variant/40 hover:border-outline'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={shippingMethod === 'nextday'}
                    onChange={() => setShippingMethod('nextday')}
                    className="accent-primary"
                  />
                  <div>
                    <h4 className="font-bold text-xs text-primary uppercase">OVERNIGHT AIR GUARANTEE</h4>
                    <p className="text-[11px] text-outline">Next Business Day Delivery before 10:30 AM</p>
                  </div>
                </div>
                <span className="font-headline font-bold text-xs text-primary">$25.00</span>
              </label>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 space-y-6 shadow-sm">
            <h2 className="font-headline font-extrabold text-xl text-primary tracking-tight">
              3. PAYMENT METHOD
            </h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-outline mb-1">CARD NUMBER</label>
                <input
                  type="text"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">EXPIRY DATE</label>
                  <input
                    type="text"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">SECURITY CODE (CVC)</label>
                  <input
                    type="text"
                    required
                    value={cardCvc}
                    onChange={(e) => setCardCvc(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary font-mono"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || items.length === 0}
              className="w-full py-4 bg-primary text-on-primary font-extrabold text-xs uppercase tracking-[0.2em] hover:bg-primary-container transition-all rounded-xl shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  PROCESSING ORDER...
                </>
              ) : (
                `PLACE ORDER • $${total.toFixed(2)} USD`
              )}
            </button>
          </div>

        </form>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-5 bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 space-y-6 shadow-sm sticky top-28">
          <h2 className="font-headline font-extrabold text-xl text-primary tracking-tight">
            ORDER ITEMS ({items.reduce((acc, i) => acc + i.quantity, 0)})
          </h2>

          <div className="divide-y divide-outline-variant/20 max-h-[350px] overflow-y-auto pr-2">
            {items.map((item) => (
              <div key={item.id} className="py-3 flex gap-4 items-center">
                <div className="relative w-16 h-20 bg-surface-container rounded-lg overflow-hidden shrink-0 border">
                  <Image src={item.product.images[0]} alt={item.product.name} fill className="object-cover" />
                </div>
                <div className="flex-1 text-xs space-y-1">
                  <h4 className="font-headline font-bold text-primary">{item.product.name}</h4>
                  <p className="text-[11px] text-outline">
                    {item.selectedColor.name} | Size: {item.selectedSize} | Qty: {item.quantity}
                  </p>
                </div>
                <span className="font-headline font-bold text-xs text-primary">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-3 text-xs border-t border-outline-variant/30 pt-4">
            <div className="flex justify-between text-on-surface-variant">
              <span>Subtotal</span>
              <span className="font-bold text-primary">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Shipping</span>
              <span className="font-bold text-primary">
                {shippingFee === 0 ? 'FREE' : `$${shippingFee.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-on-surface-variant">
              <span>Sales Tax (8%)</span>
              <span className="font-bold text-primary">${tax.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-base border-t border-outline-variant/30 pt-4">
            <span className="font-headline font-extrabold uppercase text-primary">GRAND TOTAL</span>
            <span className="font-headline font-extrabold text-2xl text-primary">
              ${total.toFixed(2)} USD
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
