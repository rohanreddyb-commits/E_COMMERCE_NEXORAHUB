'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Feedback';

/**
 * Route guard for customer-only pages.
 *
 * Renders nothing until the persisted session has been validated, then either
 * shows the page or bounces to /login with a `next` param so the customer
 * lands back where they were after signing in.
 */
export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, initializing } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initializing && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [initializing, isAuthenticated, pathname, router]);

  if (initializing || !isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" label="Checking your session" />
      </div>
    );
  }

  return <>{children}</>;
};
