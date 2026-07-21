'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export const Footer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-primary text-on-primary border-t border-primary-container pt-16 pb-12">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8">
        
        {/* Top Section: Newsletter & Brand Message */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-16 border-b border-primary-container">
          
          <div className="lg:col-span-5 space-y-4">
            <span className="font-headline font-extrabold text-3xl tracking-tighter block">
              AESTHETE
            </span>
            <p className="text-on-primary-container text-sm leading-relaxed max-w-md">
              Quiet luxury with a digital pulse. Architectural streetwear cut from double-faced organic fleeces and technical Japanese fabrics.
            </p>
          </div>

          <div className="lg:col-span-7 flex flex-col justify-center">
            <h4 className="font-headline text-lg font-semibold tracking-wide mb-2">
              JOIN THE PRIVATE DISPATCH
            </h4>
            <p className="text-on-primary-container text-xs tracking-wider uppercase mb-4">
              RECEIVE LIMITED CAPSULE ACCESS & PRIVATE EDITORIAL RELEASES.
            </p>

            {subscribed ? (
              <div className="p-4 bg-secondary-container/20 border border-secondary-container text-secondary-container text-xs font-semibold uppercase tracking-widest rounded-lg">
                ✓ THANK YOU. YOUR EDITORIAL ACCESS IS CONFIRMED.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-primary-container border border-on-primary-container/30 px-4 py-3.5 text-xs text-on-primary placeholder:text-on-primary-container focus:outline-none focus:border-on-primary flex-1 rounded-md"
                />
                <button
                  type="submit"
                  className="bg-on-primary text-primary px-8 py-3.5 text-xs font-bold uppercase tracking-widest hover:bg-surface-variant transition-colors rounded-md shrink-0"
                >
                  SUBSCRIBE
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Middle Section: Quick Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 text-xs border-b border-primary-container">
          <div>
            <h5 className="font-bold tracking-widest uppercase mb-4 text-on-primary">COLLECTIONS</h5>
            <ul className="space-y-2.5 text-on-primary-container">
              <li><Link href="/" className="hover:text-on-primary transition-colors">Core Heavyweights</Link></li>
              <li><Link href="/" className="hover:text-on-primary transition-colors">Architectural Outerwear</Link></li>
              <li><Link href="/" className="hover:text-on-primary transition-colors">Tactile Bottoms</Link></li>
              <li><Link href="/" className="hover:text-on-primary transition-colors">Limited Capsules</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold tracking-widest uppercase mb-4 text-on-primary">CUSTOMER CARE</h5>
            <ul className="space-y-2.5 text-on-primary-container">
              <li><Link href="/cart" className="hover:text-on-primary transition-colors">Express Shipping</Link></li>
              <li><Link href="/profile" className="hover:text-on-primary transition-colors">Returns & Exchanges</Link></li>
              <li><Link href="/product/aesthete-essential-hoodie" className="hover:text-on-primary transition-colors">Garment Care Guide</Link></li>
              <li><Link href="/profile" className="hover:text-on-primary transition-colors">Order Tracking</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold tracking-widest uppercase mb-4 text-on-primary">EDITORIAL</h5>
            <ul className="space-y-2.5 text-on-primary-container">
              <li><Link href="/" className="hover:text-on-primary transition-colors">Lookbook 2026</Link></li>
              <li><Link href="/" className="hover:text-on-primary transition-colors">Design Manifesto</Link></li>
              <li><Link href="/" className="hover:text-on-primary transition-colors">Sustainable Sourcing</Link></li>
              <li><Link href="/" className="hover:text-on-primary transition-colors">Atelier Paris</Link></li>
            </ul>
          </div>

          <div>
            <h5 className="font-bold tracking-widest uppercase mb-4 text-on-primary">CONNECT</h5>
            <ul className="space-y-2.5 text-on-primary-container">
              <li><a href="#" className="hover:text-on-primary transition-colors">Instagram @AESTHETE</a></li>
              <li><a href="#" className="hover:text-on-primary transition-colors">Vimeo Editorial</a></li>
              <li><a href="#" className="hover:text-on-primary transition-colors">Substack Dispatch</a></li>
              <li><a href="#" className="hover:text-on-primary transition-colors">Press & Media</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Section: Copyright & Legal */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-on-primary-container">
          <p>© {new Date().getFullYear()} AESTHETE FASHION HOUSE. ALL RIGHTS RESERVED.</p>
          <div className="flex space-x-6">
            <Link href="/" className="hover:text-on-primary transition-colors">PRIVACY POLICY</Link>
            <Link href="/" className="hover:text-on-primary transition-colors">TERMS OF SERVICE</Link>
            <Link href="/" className="hover:text-on-primary transition-colors">ACCESSIBILITY</Link>
          </div>
        </div>

      </div>
    </footer>
  );
};
