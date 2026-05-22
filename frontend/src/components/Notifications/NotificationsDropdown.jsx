'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { Bell, Check, Info, AlertTriangle, AlertCircle, Trash2, ExternalLink } from 'lucide-react';
import { notificationService } from '@/services/notification.service';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function NotificationsDropdown() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [isRinging, setIsRinging] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const { user } = useAuth();

  const isRTL = i18n.dir() === 'rtl';

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await notificationService.getAll();
      if (res?.data) {
        setNotifications(res.data);
      }
    } catch (e) {
      console.error('Failed to fetch notifications', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) {
      return;
    }
    
    const roleName = user.role || 'normal_user';
    
    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      roleName,
      user.governorate || null,
      (newNotif) => {
        // Play ring animation
        setIsRinging(true);
        setTimeout(() => setIsRinging(false), 2000);
        
        setNotifications((prev) => {
          // Prevent duplicates if already in list
          if (prev.find(n => n.id === newNotif.id)) {
            return prev;
          }
          // Ensure it's marked unread initially on frontend
          return [{...newNotif, is_read: false}, ...prev];
        });
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target) &&
        triggerRef.current && !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Update coords on scroll/resize just in case
      const updatePosition = () => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 8,
            ...(isRTL ? { right: window.innerWidth - rect.right } : { left: rect.left }),
          });
        }
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, isRTL]);

  const toggleDropdown = () => {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        ...(isRTL ? { right: window.innerWidth - rect.right } : { left: rect.left }),
      });
    }
    setIsOpen(!isOpen);
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return <AlertCircle size={16} color="#dc2626" />;
      case 'warning': return <AlertTriangle size={16} color="#d97706" />;
      default: return <Info size={16} color="#3b82f6" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'rgba(220, 38, 38, 0.1)';
      case 'warning': return 'rgba(217, 119, 6, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Trigger */}
      <button
        ref={triggerRef}
        onClick={toggleDropdown}
        className={isRinging ? 'bell-ring-anim' : ''}
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          width: 40,
          height: 40,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s ease',
          color: 'var(--text-secondary)'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = 'var(--text-primary)';
          e.currentTarget.style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            e.currentTarget.style.color = 'var(--text-secondary)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }
        }}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: '#ef4444',
            color: 'white',
            fontSize: 11,
            fontWeight: 800,
            borderRadius: 10,
            padding: '2px 6px',
            minWidth: 18,
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(239, 68, 68, 0.4)'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu (Portal) */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          style={{
            ...dropdownStyle,
            width: 340,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 10px 50px rgba(0,0,0,0.3)',
            zIndex: 999999,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-primary)'
          }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('notifications.title', 'Notifications')}
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 12,
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                <Check size={14} />
                {t('notifications.mark_all_read', 'Mark all as read')}
              </button>
            )}
          </div>

          {/* List */}
          <div style={{
            maxHeight: 360,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={20} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                </div>
                {t('notifications.all_caught_up', "You're all caught up!")}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => { if (!n.is_read) handleMarkAsRead(n.id); }}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    gap: 12,
                    cursor: n.is_read ? 'default' : 'pointer',
                    background: n.is_read ? 'transparent' : 'var(--bg-primary)',
                    transition: 'background 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={e => {
                    if (!n.is_read) e.currentTarget.style.background = 'var(--bg-card-hover)';
                  }}
                  onMouseLeave={e => {
                    if (!n.is_read) e.currentTarget.style.background = 'var(--bg-primary)';
                  }}
                >
                  {!n.is_read && (
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      ...(isRTL ? { right: 8 } : { left: 8 }),
                      transform: 'translateY(-50%)',
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--accent)'
                    }} />
                  )}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: getSeverityColor(n.severity),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    ...(isRTL ? { marginRight: 8 } : { marginLeft: 8 })
                  }}>
                    {getSeverityIcon(n.severity)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {n.title}
                      </h4>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {new Date(n.created_at).toLocaleDateString(isRTL ? 'ar' : 'en')}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            textAlign: 'center'
          }}>
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--accent)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              {t('notifications.view_all', 'View all notifications')}
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
