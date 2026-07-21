'use client';

import React, { useState } from 'react';

interface AccordionItemProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-outline-variant/30 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none group"
      >
        <span className="font-headline font-bold text-sm text-primary tracking-wide group-hover:text-secondary transition-colors uppercase">
          {title}
        </span>
        <span className="material-symbols-outlined text-xl text-outline group-hover:text-primary transition-transform duration-200">
          {isOpen ? 'remove' : 'add'}
        </span>
      </button>

      {isOpen && (
        <div className="mt-3 text-xs text-on-surface-variant leading-relaxed space-y-2 animate-in fade-in duration-200">
          {children}
        </div>
      )}
    </div>
  );
};
