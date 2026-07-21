'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { getTotalItems, openDrawer } = useCartStore();
  const { items: wishlistItems } = useWishlistStore();
  const [mounted, setMounted] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalCartItems = mounted ? getTotalItems() : 0;
  const wishlistCount = mounted ? wishlistItems.length : 0;

  const navLinks = [
    { label: 'HOME', href: '/' },
    { label: 'ESSENTIAL HOODIE', href: '/product/aesthete-essential-hoodie' },
    { label: 'COLLECTIONS', href: '/' },
    { label: 'EDITORIAL', href: '/' },
  ];

  return (
    <>
      {/* Top Banner */}
      <div className="bg-primary text-on-primary text-[11px] font-semibold tracking-widest uppercase py-2 text-center px-4">
        <span>COMPLIMENTARY EXPRESS WORLDWIDE SHIPPING ON ORDERS OVER $250</span>
      </div>

      {/* Main Glass Navigation Header */}
      <header className="sticky top-0 z-40 glass-nav border-b border-outline-variant/30 transition-all duration-300">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 h-20 flex items-center justify-between">
          
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-4 lg:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-on-surface hover:text-secondary transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              <span className="material-symbols-outlined text-2xl">
                {isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-on-surface hover:text-secondary transition-colors"
              aria-label="Search"
            >
              <span className="material-symbols-outlined text-2xl">search</span>
            </button>
          </div>

          {/* Left Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-8 text-[12px] font-semibold tracking-[0.15em]">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative py-1 transition-colors hover:text-secondary-fixed-dim ${
                    isActive ? 'text-primary font-bold after:content-[""] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-primary' : 'text-on-surface-variant'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Center Brand Logo */}
          <Link href="/" className="group flex flex-col items-center">
            <span className="font-headline font-extrabold text-2xl sm:text-3xl tracking-tighter text-primary group-hover:opacity-90 transition-opacity">
              AESTHETE
            </span>
            <span className="text-[9px] tracking-[0.3em] font-semibold text-outline uppercase -mt-1">
              PARIS • NEW YORK
            </span>
          </Link>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-3 sm:space-x-5">
            {/* Desktop Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="hidden lg:flex items-center gap-2 text-xs font-semibold tracking-wider text-on-surface-variant hover:text-primary transition-colors p-2"
            >
              <span className="material-symbols-outlined text-2xl">search</span>
              <span className="hidden xl:inline uppercase">SEARCH</span>
            </button>

            {/* User Profile Link */}
            <Link
              href="/profile"
              className={`p-2 transition-colors flex items-center gap-1 ${
                pathname === '/profile' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'
              }`}
              title="User Profile & Dashboard"
            >
              <span className="material-symbols-outlined text-2xl">account_circle</span>
            </Link>

            {/* Wishlist Link */}
            <Link
              href="/profile"
              className="relative p-2 text-on-surface-variant hover:text-primary transition-colors hidden sm:block"
              title="Wishlist"
            >
              <span className="material-symbols-outlined text-2xl">favorite</span>
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-secondary-container text-on-secondary-container font-bold text-[10px] rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Drawer Trigger Button */}
            <button
              onClick={openDrawer}
              className="relative p-2.5 bg-primary text-on-primary rounded-full hover:bg-primary-container transition-transform active:scale-95 flex items-center justify-center shadow-sm"
              aria-label="Open Shopping Bag"
            >
              <span className="material-symbols-outlined text-xl">shopping_bag</span>
              {totalCartItems > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary-container text-on-secondary-container font-bold text-[10px] rounded-full flex items-center justify-center shadow-md">
                  {totalCartItems}
                </span>
              )}
            </button>
          </div>

        </div>

        {/* Expandable Search Drawer / Bar */}
        {isSearchOpen && (
          <div className="border-t border-outline-variant/30 bg-surface-container-lowest py-4 px-6 animate-in slide-in-from-top duration-200">
            <div className="max-w-2xl mx-auto flex items-center gap-3">
              <span className="material-symbols-outlined text-outline">search</span>
              <input
                type="text"
                placeholder="Search editorial outerwear, hoodies, tailoring..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-on-surface focus:outline-none placeholder:text-outline"
                autoFocus
              />
              <button
                onClick={() => setIsSearchOpen(false)}
                className="text-xs font-semibold uppercase tracking-wider text-outline hover:text-primary"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-outline-variant/30 bg-surface-container-lowest px-6 py-6 space-y-4 shadow-xl">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className="block text-sm font-semibold tracking-widest text-on-surface hover:text-secondary"
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
              <Link
                href="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-xs font-semibold tracking-widest text-on-surface flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">shopping_bag</span>
                SHOPPING BAG ({totalCartItems})
              </Link>
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-xs font-semibold tracking-widest text-on-surface flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">person</span>
                ACCOUNT
              </Link>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
