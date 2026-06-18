'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { getPreferences, updatePreferences } from '@/services/preferences.service';
import { supabase } from '@/lib/supabase';
import { validatePassword, getPasswordValidationRules } from '@/lib/validators';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  // State
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({ full_name: '', email: '' });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [renderError, setRenderError] = useState(null);

  // Preferences
  const [prefs, setPrefs] = useState({
    preferred_theme: 'dark',
    preferred_language: 'en',
    emailAlerts: true,
    twoFactor: false
  });

  useEffect(() => {
    setMounted(true);
    console.log('[DEBUG] SettingsPage Mount - user:', !!user);
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: user.name || user.full_name || '',
        email: user.email || ''
      }));
    }

    const fetchPrefs = async () => {
      try {
        const data = await getPreferences();
        if (data) setPrefs(p => ({ ...p, ...data }));
      } catch (err) {
        console.error('[DEBUG] Prefs Fetch Error:', err);
      }
    };
    fetchPrefs();
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePrefToggle = async (key) => {
    const newVal = !prefs[key];
    setPrefs(p => ({ ...p, [key]: newVal }));

    // If it's theme or language, update it via the theme/i18n hooks too
    if (key === 'preferred_theme') {
      const themeVal = newVal === true ? 'dark' : (newVal === false ? 'light' : newVal);
      setTheme(themeVal);
    } else if (key === 'preferred_language') {
      const langVal = newVal === true ? 'ar' : (newVal === false ? 'en' : newVal);
      i18n.changeLanguage(langVal);
    }
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

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    // 1. Basic Validation
    const pErr = validatePassword(passwordData.newPassword);
    if (pErr) {
      setError(pErr);
      setLoading(false);
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError(t('settings.password_mismatch'));
      setLoading(false);
      return;
    }

    try {
      // 2. Verify Old Password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: passwordData.currentPassword
      });

      if (signInError) {
        setError(t('settings.password_incorrect'));
        setLoading(false);
        return;
      }

      // 3. Update Password
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) throw updateError;

      setMessage(t('settings.password_update_success'));
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });

    } catch (err) {
      console.error('[DEBUG] Password Update Error:', err);
      setError(t('settings.password_update_error'));
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

  console.log('[DEBUG] Render - activeTab:', activeTab, 'mounted:', mounted);
  const isRTL = i18n?.language === 'ar';

  if (renderError) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Something went wrong</h2>
        <p>{renderError.message}</p>
        <button onClick={() => setRenderError(null)}>Retry</button>
      </div>
    );
  }

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
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>{t('settings.profile_info')}</h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32, padding: 20, background: 'var(--bg-primary)', borderRadius: 16, border: '1px solid var(--border)' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--purple-light)', border: '1px solid var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', fontSize: 24, fontWeight: 700, flexShrink: 0 }}>
                  {formData?.full_name ? String(formData.full_name).charAt(0) : (user?.email?.charAt(0)?.toUpperCase() || 'U')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{formData?.full_name || user?.name || 'User'}</h3>
                    <span style={{ padding: '2px 8px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: 100, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>
                      {user?.role?.replace('_', ' ') || 'N/A'}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>{user?.email}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('settings.full_name')}</label>
                    <input
                      type="text"
                      name="full_name"
                      value={formData?.full_name || ''}
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
                      value={formData?.email || ''}
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
            <div>
              {console.log('[DEBUG] Rendering Security Tab')}
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>{t('settings.security')}</h2>

              <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>{t('settings.change_password')}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 450 }}>

                    {/* Current Password */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('settings.current_password')}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(p => ({ ...p, currentPassword: e.target.value }))}
                          required
                          className="form-input"
                          style={{ width: '100%', padding: '12px 14px', paddingRight: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          {showPasswords.current ? (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L14.5 14.5M21 12a9.965 9.965 0 01-1.55 3.033M16.24 16.24l2.88 2.88M9.172 9.172L6.112 6.112M12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l3.59 3.59" /></svg>
                          ) : (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('settings.new_password')}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                          required
                          className="form-input"
                          style={{ width: '100%', padding: '12px 14px', paddingRight: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          {showPasswords.new ? (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L14.5 14.5M21 12a9.965 9.965 0 01-1.55 3.033M16.24 16.24l2.88 2.88M9.172 9.172L6.112 6.112M12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l3.59 3.59" /></svg>
                          ) : (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                      {passwordData.newPassword && (
                        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {Object.entries({
                            length: 'At least 8 characters',
                            uppercase: 'One uppercase letter',
                            number: 'One number',
                            special: 'One special character'
                          }).map(([key, label]) => {
                            const isValid = getPasswordValidationRules(passwordData.newPassword)[key];
                            return (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: isValid ? '#22c55e' : 'var(--text-muted)' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  {isValid ? <polyline points="20 6 9 17 4 12" /> : <circle cx="12" cy="12" r="10" />}
                                </svg>
                                <span>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)' }}>{t('settings.confirm_new_password')}</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                          required
                          className="form-input"
                          style={{ width: '100%', padding: '12px 14px', paddingRight: 44, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        >
                          {showPasswords.confirm ? (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L14.5 14.5M21 12a9.965 9.965 0 01-1.55 3.033M16.24 16.24l2.88 2.88M9.172 9.172L6.112 6.112M12 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21M3 3l3.59 3.59" /></svg>
                          ) : (
                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          )}
                        </button>
                      </div>
                    </div>

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
            <div>
              {console.log('[DEBUG] Rendering Notifications Tab')}
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>{t('settings.notifications')}</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                <div style={{ padding: 20, border: '1px solid var(--border)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 600, margin: '0 0 4px' }}>{t('settings.system_alerts')}</h4>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{t('settings.system_alerts_desc')}</p>
                  </div>
                  <div
                    onClick={() => handlePrefToggle('emailAlerts')}
                    style={{ width: 44, height: 24, background: prefs?.emailAlerts ? 'var(--accent)' : 'var(--bg-primary)', borderRadius: 24, border: `1px solid ${prefs?.emailAlerts ? 'var(--accent)' : 'var(--border)'}`, position: 'relative', cursor: 'pointer', transition: '0.3s', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, background: '#fff', borderRadius: '50%', position: 'absolute', top: 2, left: prefs?.emailAlerts ? 22 : 2, transition: '0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* APPEARANCE & LANGUAGE TAB */}
          {activeTab === 'appearance' && (
            <div>
              {console.log('[DEBUG] Rendering Appearance Tab, mounted:', mounted)}
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
                        onClick={() => {
                          setTheme(opt);
                          setPrefs(p => ({ ...p, preferred_theme: opt }));
                        }}
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
                      onClick={() => {
                        i18n.changeLanguage('en');
                        setPrefs(p => ({ ...p, preferred_language: 'en' }));
                      }}
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
                      onClick={() => {
                        i18n.changeLanguage('ar');
                        setPrefs(p => ({ ...p, preferred_language: 'ar' }));
                      }}
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

          {/* FALLBACK IF NO TAB MATCHES */}
          {!['profile', 'security', 'notifications', 'appearance'].includes(activeTab) && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <p>Please select a settings category from the sidebar.</p>
              <button onClick={() => setActiveTab('profile')} className="btn-primary" style={{ marginTop: 16 }}>
                Go to Profile
              </button>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
