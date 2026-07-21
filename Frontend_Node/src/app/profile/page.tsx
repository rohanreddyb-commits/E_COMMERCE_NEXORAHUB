'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MOCK_USER, MOCK_ORDERS } from '@/data/mockData';
import { useWishlistStore } from '@/store/useWishlistStore';
import { ProductCard } from '@/components/ui/ProductCard';

type TabType = 'orders' | 'addresses' | 'wishlist' | 'settings';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<TabType>('orders');
  const [user, setUser] = useState(MOCK_USER);
  const [orders] = useState(MOCK_ORDERS);
  const { items: wishlistItems } = useWishlistStore();

  // Settings Form State
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [phone, setPhone] = useState(user.phone);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setUser((prev) => ({ ...prev, name, email, phone }));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 space-y-10">
      
      {/* Profile Header Hero Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
        
        <div className="flex items-center gap-6">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-primary shadow-md shrink-0">
            <Image
              src={user.avatar}
              alt={user.name}
              fill
              className="object-cover"
            />
          </div>

          <div className="space-y-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
              <h1 className="font-headline font-extrabold text-2xl sm:text-3xl text-primary tracking-tight">
                {user.name}
              </h1>
              <span className="px-3 py-1 bg-secondary-container text-on-secondary-container font-extrabold text-[9px] uppercase tracking-widest rounded-full">
                {user.memberTier}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant font-medium">{user.email}</p>
            <p className="text-[11px] text-outline">MEMBER SINCE {user.memberSince} • PARALLEL CLUB VIP</p>
          </div>
        </div>

        <Link
          href="/"
          className="px-6 py-3 border border-outline-variant text-primary font-bold text-xs uppercase tracking-widest hover:bg-surface-container transition-colors rounded-lg"
        >
          LOG OUT
        </Link>

      </div>

      {/* Main Tabbed Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Sidebar Nav Tabs */}
        <div className="lg:col-span-3 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-3 space-y-1 shadow-sm">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-all ${
              activeTab === 'orders'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg">local_shipping</span>
              ORDER HISTORY
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-extrabold">
              {orders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all ${
              activeTab === 'addresses'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-lg">location_on</span>
            SAVED ADDRESSES
          </button>

          <button
            onClick={() => setActiveTab('wishlist')}
            className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-all ${
              activeTab === 'wishlist'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-lg">favorite</span>
              SAVED WISHLIST
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-extrabold">
              {wishlistItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full text-left px-4 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all ${
              activeTab === 'settings'
                ? 'bg-primary text-on-primary shadow-md'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-lg">settings</span>
            ACCOUNT SETTINGS
          </button>
        </div>


        {/* Content Panel */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <h2 className="font-headline font-extrabold text-2xl text-primary">PAST ORDERS</h2>
                <span className="text-xs font-semibold text-outline">SHOWING {orders.length} ORDERS</span>
              </div>

              <div className="space-y-6">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 space-y-4 shadow-sm"
                  >
                    {/* Order Meta Header */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/20 pb-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">ORDER NUMBER</span>
                        <span className="font-mono font-extrabold text-sm text-primary">{order.orderNumber}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">DATE PLACED</span>
                        <span className="font-semibold text-on-surface">{order.date}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">STATUS</span>
                        <span className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md uppercase tracking-wider ${
                          order.status === 'Delivered'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-primary-container text-on-primary'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-wider block">TOTAL</span>
                        <span className="font-headline font-extrabold text-sm text-primary">${order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Order Items List */}
                    <div className="space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="relative w-16 h-20 bg-surface-container rounded-lg overflow-hidden shrink-0 border">
                            <Image src={item.image} alt={item.productName} fill className="object-cover" />
                          </div>
                          <div className="flex-1 text-xs space-y-0.5">
                            <h4 className="font-headline font-bold text-primary">{item.productName}</h4>
                            <p className="text-[11px] text-outline">
                              Color: {item.color} | Size: {item.size} | Qty: {item.quantity}
                            </p>
                          </div>
                          <span className="font-headline font-bold text-xs text-primary">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Tracking Action */}
                    {order.trackingNumber && (
                      <div className="pt-2 flex items-center justify-between border-t border-outline-variant/20 text-xs">
                        <span className="text-outline text-[11px]">Tracking ID: {order.trackingNumber}</span>
                        <a
                          href="#"
                          onClick={(e) => { e.preventDefault(); alert(`Tracking ID: ${order.trackingNumber}`); }}
                          className="font-bold text-primary hover:underline flex items-center gap-1"
                        >
                          TRACK SHIPMENT VIA DHL <span className="material-symbols-outlined text-sm">open_in_new</span>
                        </a>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            </div>
          )}


          {/* TAB 2: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <h2 className="font-headline font-extrabold text-2xl text-primary">SAVED ADDRESSES</h2>
                <button
                  onClick={() => alert('New address form ready')}
                  className="px-4 py-2 bg-primary text-on-primary font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-primary-container transition-colors"
                >
                  + ADD NEW ADDRESS
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 space-y-4 shadow-sm relative"
                  >
                    {addr.isDefault && (
                      <span className="absolute top-4 right-4 px-2.5 py-1 bg-secondary-container text-on-secondary-container font-extrabold text-[9px] uppercase tracking-widest rounded-md">
                        DEFAULT ADDRESS
                      </span>
                    )}

                    <div className="space-y-1 text-xs">
                      <h3 className="font-headline font-bold text-base text-primary">{addr.fullName}</h3>
                      <p className="text-on-surface-variant font-medium">{addr.street} {addr.apartment}</p>
                      <p className="text-on-surface-variant font-medium">{addr.city}, {addr.state} {addr.zipCode}</p>
                      <p className="text-outline font-semibold">{addr.country}</p>
                    </div>

                    <div className="pt-2 flex items-center gap-3 text-xs font-bold uppercase tracking-wider">
                      <button className="text-primary hover:underline">EDIT</button>
                      <span>•</span>
                      <button className="text-error hover:underline">REMOVE</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}


          {/* TAB 3: WISHLIST */}
          {activeTab === 'wishlist' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
                <h2 className="font-headline font-extrabold text-2xl text-primary">MY WISHLIST</h2>
                <span className="text-xs font-semibold text-outline">{wishlistItems.length} SAVED ITEMS</span>
              </div>

              {wishlistItems.length === 0 ? (
                <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-12 text-center space-y-4">
                  <span className="material-symbols-outlined text-4xl text-outline">favorite</span>
                  <p className="text-xs font-bold uppercase tracking-widest text-outline">
                    YOUR WISHLIST IS CURRENTLY EMPTY.
                  </p>
                  <Link
                    href="/"
                    className="inline-block px-6 py-3 bg-primary text-on-primary font-bold text-xs uppercase tracking-widest rounded-md"
                  >
                    DISCOVER COLLECTIONS
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistItems.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          )}


          {/* TAB 4: SETTINGS */}
          {activeTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="bg-surface-container-lowest border border-outline-variant/40 rounded-2xl p-6 space-y-6 shadow-sm">
              <div className="border-b border-outline-variant/30 pb-4">
                <h2 className="font-headline font-extrabold text-2xl text-primary">ACCOUNT PROFILE</h2>
                <p className="text-xs text-outline font-medium">Update your personal account credentials and communications preference.</p>
              </div>

              {saveSuccess && (
                <div className="p-4 bg-secondary-container/20 border border-secondary-container text-secondary-container font-bold text-xs uppercase tracking-widest rounded-lg">
                  ✓ PROFILE SETTINGS SAVED SUCCESSFULLY.
                </div>
              )}

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">FULL NAME</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface font-medium focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface font-medium focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block font-bold uppercase tracking-wider text-outline mb-1">PHONE NUMBER</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-lg text-on-surface font-medium focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-8 py-3.5 bg-primary text-on-primary font-extrabold text-xs uppercase tracking-widest hover:bg-primary-container transition-colors rounded-lg shadow-lg"
                >
                  SAVE CHANGES
                </button>
              </div>
            </form>
          )}

        </div>

      </div>

    </div>
  );
}
