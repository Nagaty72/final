'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationsDropdown from './Notifications/NotificationsDropdown';
import { ROLES, getRoleLabel, getRoleBadgeColor } from '@/lib/rbac';

/**
 * NAV_ITEMS — Sidebar navigation registry.
 *
 * `roles` field:
 *   undefined / null → visible to ALL authenticated users
 *   string[]         → visible ONLY to these roles
 *
 * Keep in sync with ROUTE_PERMISSIONS in src/lib/rbac.js.
 */
const NAV_ITEMS = [
  // ── Universal (all roles) ─────────────────────────────────────────────────
  {
    key:  'dashboard',
    href: '/dashboard',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    key:  'disease_map',
    href: '/intelligence-map',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key:  'hospitals',
    href: '/hospitals',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2m-2 0a2 2 0 002-2M5 21H3m2 0a2 2 0 01-2-2m9-13h.01M12 12h.01M12 16h.01" />
      </svg>
    ),
  },
  {
    key:  'chatbot',
    href: '/chatbot',
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
  },

  // ── Decision Maker + Super Admin ─────────────────────────────────────────
  {
    key:   'disease_analytics',
    href:  '/diseases',
    roles: [ROLES.SUPER_ADMIN, ROLES.DECISION_MAKER],
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key:   'report_builder',
    href:  '/reports',
    roles: [ROLES.SUPER_ADMIN, ROLES.DECISION_MAKER],
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
      </svg>
    ),
  },

  // ── Super Admin only ─────────────────────────────────────────────────────
  {
    key:   'admin_panel',
    href:  '/admin-panel',
    roles: [ROLES.SUPER_ADMIN],
    icon: (
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

// ── Role badge chip ─────────────────────────────────────────────────────────
function RoleBadge({ role, collapsed }) {
  const color = getRoleBadgeColor(role);
  const label = getRoleLabel(role);
  if (collapsed) return (
    <div style={{
      width: 8, height: 8, borderRadius: '50%',
      background: color, flexShrink: 0,
      boxShadow: `0 0 5px ${color}88`,
    }} title={label} />
  );
  return (
    <div style={{
      fontSize: 10, fontWeight: 600,
      background: `${color}10`, color,
      border: `1px solid ${color}30`,
      borderRadius: '4px', padding: '1px 6px',
      letterSpacing: '0.04em', textTransform: 'uppercase',
      whiteSpace: 'nowrap', display: 'inline-block'
    }}>
      {label}
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────────────────────────────
export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const isRTL = i18n.language === 'ar';

  React.useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [isCollapsed]);

  // Filter nav items based on the user's role
  const visibleItems = React.useMemo(() => NAV_ITEMS.filter(item => {
    if (!item.roles) return true;              // no restriction
    return item.roles.includes(user?.role);    // role-gated
  }), [user?.role]);

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo / Header */}
      <div style={{ padding: '24px 20px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
          <div style={{
            width: 32, height: 32, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', borderRadius: '8px',
            background: '#fff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }} className="dark:shadow-none transition-all">
            <img src="/logo.jpeg" alt="Epicare Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div className="sidebar-header-text" style={{ flexShrink: 0, whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em',
              color: 'var(--text-primary)', fontFamily: 'var(--font-display)',
              lineHeight: 1
            }}>
              Epicare
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500, letterSpacing: '0.02em' }}>
              Intelligence Platform
            </div>
          </div>
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute', top: 28,
          ...(isRTL ? { left: -14 } : { right: -14 }),
          width: 28, height: 28,
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 50, color: 'var(--text-secondary)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: '0.2s',
        }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{
          transform: isCollapsed
            ? (isRTL ? 'rotate(0deg)' : 'rotate(180deg)')
            : (isRTL ? 'rotate(180deg)' : 'rotate(0)'),
          transition: 'transform 0.3s ease',
        }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Theme / Language / Notifications */}
      {!isCollapsed && (
        <div style={{ padding: '0 20px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <ThemeToggle />
          <LanguageSwitcher />
          <div style={{ marginLeft: 'auto' }}>
            <NotificationsDropdown />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', overflowX: 'hidden' }}>
        {visibleItems.map(item => (
          <Link
            key={item.href}
            href={item.href}
            title={isCollapsed ? t(`sidebar.${item.key}`) : ''}
            className={`sidebar-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
          >
            {item.icon}
            <span className="sidebar-text">{t(`sidebar.${item.key}`)}</span>
          </Link>
        ))}
      </nav>

      {/* User footer (Vercel/Linear Style) */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'transparent' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: isCollapsed ? '6px' : '8px 12px',
          borderRadius: 8, transition: 'all 0.2s',
          cursor: 'pointer',
          border: '1px solid transparent',
        }}
        className="sidebar-user-card hover:bg-[rgba(255,255,255,0.03)] hover:border-[rgba(255,255,255,0.05)]"
        >
          {/* Avatar */}
          <div style={{
            width: 32, height: 32, borderRadius: 6, flexShrink: 0,
            background: 'linear-gradient(135deg, var(--accent), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 600, fontSize: 13, textTransform: 'uppercase',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 2px 4px rgba(0,0,0,0.2)'
          }} title={isCollapsed ? (user?.full_name || user?.name || 'User') : ''}>
            {(user?.full_name || user?.name || 'U').charAt(0)}
          </div>

          {/* Name + Role badge */}
          {!isCollapsed && (
            <div className="sidebar-user-text" style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
                {user?.full_name || user?.name || 'User'}
              </div>
              <div>
                <RoleBadge role={user?.role} collapsed={false} />
              </div>
            </div>
          )}

          {/* Settings + Logout */}
          {!isCollapsed && (
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, opacity: 0.6, transition: '0.2s' }} className="user-actions">
              <Link href="/settings" title={t('sidebar.settings')} className="text-muted hover:text-accent p-1 transition-colors">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
              <button onClick={logout} title={t('sidebar.logout')} className="text-muted hover:text-danger p-1 transition-colors">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
      <style jsx>{`
        .sidebar-user-card:hover .user-actions { opacity: 1; }
      `}</style>
    </aside>
  );
}
