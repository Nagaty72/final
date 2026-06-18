'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { canAccess } from '@/lib/rbac';

/**
 * RouteGuard — Wraps a page and enforces role-based access control.
 *
 * Behaviour:
 *  • While auth is loading → show spinner (no flash of forbidden content)
 *  • Not authenticated     → redirect to /login
 *  • Authenticated but email not OTP-verified → redirect to /verify-email
 *  • Authenticated but wrong role → redirect to /dashboard (with ?forbidden=1)
 *  • Authorized            → render children normally
 */
export default function RouteGuard({ children }) {
  const { user, loading } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();

  React.useEffect(() => {
    if (loading) return;

    // Not logged in at all
    if (!user) {
      router.replace('/');
      return;
    }

    console.log('[RUNTIME] ROUTEGUARD_CHECK for user:', user.email, 'is_verified:', user.is_verified);

    // Logged in but OTP verification not complete
    if (!user.is_verified) {
      console.log('[RUNTIME] REDIRECT_TO_VERIFY_EMAIL (from RouteGuard)');
      console.warn('[ROUTE GUARD] Unverified user blocked from:', pathname);
      router.replace(`/verify-email?email=${encodeURIComponent(user.email || '')}`);
      return;
    }

    // Logged in and verified but wrong role for this route
    if (!canAccess(user.role, pathname)) {
      router.replace('/dashboard?forbidden=1');
      return;
    }

    if (pathname.includes('/dashboard')) {
      console.log('[RUNTIME] DASHBOARD_ACCESS_GRANTED');
    }

  }, [loading, user, pathname, router]);

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 12,
        background: 'var(--bg-primary)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--accent)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
          Verifying access…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not logged in — returning null while redirect fires
  if (!user) return null;

  // Unverified — returning null while redirect fires
  if (!user.is_verified) return null;

  // Forbidden role — returning null while redirect fires
  if (!canAccess(user.role, pathname)) return null;

  return <>{children}</>;
}
