'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { notificationService } from '@/services/notification.service';
import { Check, Info, AlertTriangle, AlertCircle, Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;
    
    const roleName = user.role || 'normal_user';
    
    const unsubscribe = notificationService.subscribeToNotifications(
      user.id,
      roleName,
      user.governorate || null,
      (newNotif) => {
        setNotifications((prev) => {
          if (prev.find(n => n.id === newNotif.id)) return prev;
          return [{...newNotif, is_read: false}, ...prev];
        });
      }
    );
    
    return () => {
      unsubscribe();
    };
  }, [user]);

  const handleMarkAsRead = async (id) => {
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

  const getSeverityIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return <AlertCircle size={24} color="#dc2626" />;
      case 'warning': return <AlertTriangle size={24} color="#d97706" />;
      default: return <Info size={24} color="#3b82f6" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'rgba(220, 38, 38, 0.1)';
      case 'warning': return 'rgba(217, 119, 6, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={24} color="var(--accent)" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>
              {t('notifications.title', 'Notifications')}
            </h1>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)' }}>
              {unreadCount} {t('notifications.unread', 'unread')}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            style={{
              padding: '10px 20px',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s'
            }}
          >
            <Check size={18} color="var(--success)" />
            {t('notifications.mark_all_read', 'Mark all as read')}
          </button>
        )}
      </div>

      <div style={{ minHeight: 400 }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: 80, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={40} color="var(--text-muted)" style={{ opacity: 0.5 }} />
            </div>
            <h3 style={{ margin: 0, fontSize: 20, color: 'var(--text-primary)' }}>
              {t('notifications.all_caught_up', "You're all caught up!")}
            </h3>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              onClick={() => { if (!n.is_read) handleMarkAsRead(n.id); }}
              style={{
                padding: '24px 32px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                gap: 20,
                cursor: n.is_read ? 'default' : 'pointer',
                background: n.is_read ? 'transparent' : 'var(--bg-primary)',
                transition: 'background 0.2s',
                position: 'relative'
              }}
            >
              {!n.is_read && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  ...(isRTL ? { right: 12 } : { left: 12 }),
                  transform: 'translateY(-50%)',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--accent)'
                }} />
              )}
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                flexShrink: 0,
                background: getSeverityColor(n.severity),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {getSeverityIcon(n.severity)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {n.title}
                  </h3>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {new Date(n.created_at).toLocaleString(isRTL ? 'ar' : 'en')}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {n.message}
                </p>
                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <span style={{ fontSize: 12, padding: '4px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    Type: {n.type || 'System'}
                  </span>
                  {n.target_role && (
                    <span style={{ fontSize: 12, padding: '4px 10px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 20, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      Target: {n.target_role.replace('_', ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
