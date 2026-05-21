import AppShell from '@/components/AppShell';

/**
 * Protected layout — wraps all authenticated pages.
 * RouteGuard is embedded inside AppShell and handles:
 *   • Redirect unauthenticated users → /login
 *   • Redirect unauthorized roles    → /dashboard?forbidden=1
 *   • Show loading spinner while auth resolves
 */
export default function ProtectedLayout({ children }) {
  return <AppShell>{children}</AppShell>;
}
