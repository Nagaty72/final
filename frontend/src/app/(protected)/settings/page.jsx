'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme, setTheme, resolvedTheme } = useTheme();
  
  // Tabs: profile, security, notifications, appearance
  const [activeTab, setActiveTab] = useState('profile');
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Mock preferences
  const [prefs, setPrefs] = useState({
    emailAlerts: true,
    weeklyReports: false,
    twoFactor: false
  });

  useEffect(() => {
    setMounted(true);
    if (user) {
      setFormData((prev) => ({
        ...prev,
        full_name: user.name || user.full_name || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePrefToggle = (key) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const payload = { full_name: formData.full_name, email: formData.email };
      if (formData.password) {
        payload.password = formData.password;
      }
      
      const res = await authService.updateMe(payload);
      if (res?.success) {
        setMessage(t('settings.success_saved'));
        setFormData((prev) => ({ ...prev, password: '' }));
        if (res.data) {
          updateUser(res.data);
        }
      }

    } catch (err) {
      setError(err.response?.data?.details?.[0] || err.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'profile', label: t('settings.profile') },
    { key: 'security', label: t('settings.security') },
    { key: 'notifications', label: t('settings.notifications') },
    { key: 'appearance', label: t('settings.appearance') },
  ];

  const isRTL = i18n.language === 'ar';

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>{t('settings.title')}</h1>
        <p style={{ fontSize: 15, color: 'var(--text-muted)', margin: 0 }}>{t('settings.subtitle')}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 32 }}>
        {/* Settings Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setMessage(''); setError(''); }}
              style={{ 
                textAlign: isRTL ? 'right' : 'left', padding: '12px 16px', borderRadius: 8, cursor: 'pointer', border: 'none',
                background: activeTab === tab.key ? 'var(--purple-light)' : 'transparent',
                color: activeTab === tab.key ? 'var(--purple)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.key ? 600 : 500,
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="glass-card" style={{ padding: 32, minHeight: 400 }}>
          {message && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderRadius: 8, marginBottom: 24, fontWeight: 500 }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              {message}
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', borderRadius: 8, marginBottom: 24, fontWeight: 500 }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          {/* PROFILE TAB */}
          {activeTab === 'profile' && (
            <div className="fade-in">
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>{t('settings.profile_info')}</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
                <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 700 }}>
                  {formData.full_name.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <button style={{ padding: '8px 16px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500, marginBottom: 8 }}>
                    {t('settings.upload_avatar')}
                  </button>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('settings.avatar_hint')}</div>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('settings.full_name')}</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData.full_name}
                      onChange={handleChange}
                      required
                      className="form-input"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('settings.email')}</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="form-input"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 24px', fontSize: 15 }}>
                    {loading ? t('settings.saving') : t('settings.save_profile')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="fade-in">
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>{t('settings.security')}</h2>
              
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{t('settings.change_password')}</h3>
                  <div style={{ maxWidth: 400 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('settings.new_password')}</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder={t('settings.password_placeholder')}
                      className="form-input"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                    />
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>{t('settings.password_hint')}</p>
                  </div>
                </div>

                <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{t('settings.two_factor')}</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('settings.two_factor_desc')}</p>
                  </div>
                  <div 
                    onClick={() => handlePrefToggle('twoFactor')}
                    style={{ width: 44, height: 24, background: prefs.twoFactor ? 'var(--success)' : 'var(--bg-primary)', borderRadius: 24, border: `1px solid ${prefs.twoFactor ? 'var(--success)' : 'var(--border)'}`, position: 'relative', cursor: 'pointer', transition: '0.3s', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: prefs.twoFactor ? 22 : 2, transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 24, marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '10px 24px', fontSize: 15 }}>
                    {loading ? t('settings.updating') : t('settings.update_security')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="fade-in">
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>{t('settings.notifications')}</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{t('settings.system_alerts')}</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('settings.system_alerts_desc')}</p>
                  </div>
                  <div 
                    onClick={() => handlePrefToggle('emailAlerts')}
                    style={{ width: 44, height: 24, background: prefs.emailAlerts ? 'var(--accent)' : 'var(--bg-primary)', borderRadius: 24, border: `1px solid ${prefs.emailAlerts ? 'var(--accent)' : 'var(--border)'}`, position: 'relative', cursor: 'pointer', transition: '0.3s', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: prefs.emailAlerts ? 22 : 2, transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                  </div>
                </div>

                <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{t('settings.weekly_reports')}</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('settings.weekly_reports_desc')}</p>
                  </div>
                  <div 
                    onClick={() => handlePrefToggle('weeklyReports')}
                    style={{ width: 44, height: 24, background: prefs.weeklyReports ? 'var(--accent)' : 'var(--bg-primary)', borderRadius: 24, border: `1px solid ${prefs.weeklyReports ? 'var(--accent)' : 'var(--border)'}`, position: 'relative', cursor: 'pointer', transition: '0.3s', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: prefs.weeklyReports ? 22 : 2, transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* APPEARANCE & LANGUAGE TAB */}
          {activeTab === 'appearance' && mounted && (
            <div className="fade-in">
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>{t('settings.appearance')}</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Theme Selector */}
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{t('settings.theme_label')}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>{t('settings.theme_desc')}</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {['light', 'dark', 'system'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setTheme(opt)}
                        style={{
                          padding: '10px 24px',
                          borderRadius: 10,
                          border: `2px solid ${theme === opt ? 'var(--accent)' : 'var(--border)'}`,
                          background: theme === opt ? 'var(--accent-light)' : 'var(--bg-primary)',
                          color: theme === opt ? 'var(--accent)' : 'var(--text-secondary)',
                          fontWeight: 600,
                          fontSize: 14,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}
                      >
                        {opt === 'light' && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                        )}
                        {opt === 'dark' && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                        )}
                        {opt === 'system' && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                        )}
                        {t(`theme.${opt}`)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Selector */}
                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{t('settings.language_label')}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>{t('settings.language_desc')}</p>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => i18n.changeLanguage('en')}
                      style={{
                        padding: '10px 24px',
                        borderRadius: 10,
                        border: `2px solid ${i18n.language === 'en' ? 'var(--accent)' : 'var(--border)'}`,
                        background: i18n.language === 'en' ? 'var(--accent-light)' : 'var(--bg-primary)',
                        color: i18n.language === 'en' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🇬🇧 {t('settings.english')}
                    </button>
                    <button
                      onClick={() => i18n.changeLanguage('ar')}
                      style={{
                        padding: '10px 24px',
                        borderRadius: 10,
                        border: `2px solid ${i18n.language === 'ar' ? 'var(--accent)' : 'var(--border)'}`,
                        background: i18n.language === 'ar' ? 'var(--accent-light)' : 'var(--bg-primary)',
                        color: i18n.language === 'ar' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: 14,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      🇪🇬 {t('settings.arabic')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      <style jsx>{`
        .fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
