'use client';

import React, { Suspense } from 'react';
import Sidebar from '@/components/Sidebar';
import RouteGuard from '@/components/RouteGuard';
import { useSearchParams } from 'next/navigation';

/**
 * ForbiddenBanner — shown when redirected with ?forbidden=1.
 * Must be in its own component so it can be wrapped in <Suspense>
 * (useSearchParams requirement in Next.js 13+).
 */
function ForbiddenBannerInner() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = React.useState(
    () => searchParams?.get('forbidden') === '1'
  );

  React.useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      background: 'rgba(239,68,68,0.12)',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 12,
      padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 10,
      backdropFilter: 'blur(10px)',
      boxShadow: '0 4px 24px rgba(239,68,68,0.15)',
      animation: 'slideInRight 0.3s ease',
    }}>
      <span style={{ fontSize: 18 }}>🔒</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>Access Denied</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          You don&apos;t have permission to view that page.
        </div>
      </div>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// Wrap in Suspense to satisfy Next.js static rendering requirement for useSearchParams
function ForbiddenBanner() {
  return (
    <Suspense fallback={null}>
      <ForbiddenBannerInner />
    </Suspense>
  );
}

// ── Shell inner — rendered once RouteGuard confirms access ─────────────────
function AppShellInner({ children }) {
  return (
    <RouteGuard>
      <ForbiddenBanner />
      <div>
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </RouteGuard>
  );
}

export default function AppShell({ children }) {
  return <AppShellInner>{children}</AppShellInner>;
}
