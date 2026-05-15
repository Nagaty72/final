'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/Sidebar';
import { useRouter } from 'next/navigation';

function AppShellInner({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  // Show nothing while checking auth
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="pulse-dot" style={{ background: 'var(--accent)', width: 12, height: 12 }} />
      </div>
    );
  }

  // Don't render until redirect happens
  if (!user) {
    return null;
  }

  return (
    <div>
      <Sidebar />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default function AppShell({ children }) {
  return <AppShellInner>{children}</AppShellInner>;
}
