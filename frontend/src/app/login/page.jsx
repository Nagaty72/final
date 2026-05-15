'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const { login: setAuthContext } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  useEffect(() => {
    const requestedMode = searchParams.get('mode');
    if (requestedMode === 'signup' || requestedMode === 'register') {
      setMode('register');
    } else if (requestedMode === 'login') {
      setMode('login');
    }
  }, [searchParams]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('ha_token');
    if (token) router.push('/dashboard');
  }, [router]);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setConfirmPassword('');
    setError('');
    setEmailError('');
    setVerificationSent(false);
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    resetForm();
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !email) return;
    
    setLoading(true);
    setError('');
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (resendError) throw resendError;
      
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend verification email.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'register' && emailError) {
      setError('Please resolve email errors first');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (mode === 'register' && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        // Authenticate via Supabase
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          if (signInError.message.includes('Email not confirmed')) {
            setVerificationSent(true);
            setMode('register');
            throw new Error('Please verify your email before logging in.');
          }
          throw signInError;
        }
        
        const { session, user } = data;
        
        // Manual verification check for safety
        if (!user.email_confirmed_at) {
          await supabase.auth.signOut();
          setVerificationSent(true);
          setMode('register');
          throw new Error('Please verify your email before logging in.');
        }

        if (session) {
          // Temporarily set token to allow getMe() to use it
          localStorage.setItem('ha_token', session.access_token);
          
          let hydratedUser = user;
          try {
            const profileRes = await authService.getMe();
            if (profileRes?.data) {
              hydratedUser = profileRes.data;
            }
          } catch (profileErr) {
            console.error('Failed to hydrate role from backend:', profileErr);
            // Fallback to supabase user with default role
            hydratedUser = { ...user, role: user.user_metadata?.role || 'normal_user' };
          }

          // Persist hydrated profile and update context
          setAuthContext(hydratedUser, session.access_token, session.refresh_token);
        }

        router.push('/dashboard');
      } else {
        // Sign up via Supabase Auth
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'normal_user'
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (signUpError) throw signUpError;
        
        setVerificationSent(true);
        setResendCooldown(60);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailBlur = async () => {
    if (mode !== 'register' || !email) return;
    setCheckingEmail(true);
    setEmailError('');
    try {
      const res = await authService.checkEmail(email);
      if (res.data?.exists) {
        setEmailError('This email is already in use');
      }
    } catch (err) {
      console.error('Failed to check email availability', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  if (!mounted) return null;

  if (verificationSent) {
    return (
      <div className="auth-page">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
        <div className="auth-container">
          <div className="auth-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', marginBottom: '24px' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                <path d="m16 19 2 2 4-4" />
              </svg>
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f1f5f9', marginBottom: '12px' }}>Verify your email</h2>
            <p style={{ color: '#94a3b8', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
              We've sent a verification link to <strong style={{ color: '#e2e8f0' }}>{email}</strong>.
              <br />Please check your inbox and click the link to verify your account before logging in.
            </p>
            
            {error && (
              <div className="auth-error" style={{ justifyContent: 'center' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleResendVerification}
              disabled={loading || resendCooldown > 0}
              className="auth-submit-btn"
              style={{ marginBottom: '16px', background: 'rgba(51, 65, 85, 0.5)', border: '1px solid rgba(148, 163, 184, 0.2)' }}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : resendCooldown > 0 ? (
                t('auth.resend_in', { seconds: resendCooldown })
              ) : (
                t('auth.resend_verification')
              )}
            </button>
            <button
              onClick={() => { setVerificationSent(false); setMode('login'); }}
              className="auth-switch"
              style={{ fontSize: '14px', width: '100%', padding: '12px', background: 'none' }}
            >
              {t('auth.return_to_login')}
            </button>
          </div>
        </div>
        <style jsx>{`
          .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #050a18; position: relative; overflow: hidden; padding: 24px; }
          .auth-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; animation: float 8s ease-in-out infinite; }
          .auth-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(59, 130, 246, 0.25), transparent 70%); top: -150px; right: -100px; animation-delay: 0s; }
          .auth-orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(168, 85, 247, 0.2), transparent 70%); bottom: -120px; left: -80px; animation-delay: -3s; }
          .auth-orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(34, 197, 94, 0.12), transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); animation-delay: -5s; }
          @keyframes float { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -20px) scale(1.05); } 66% { transform: translate(-20px, 15px) scale(0.95); } }
          .auth-container { width: 100%; max-width: 440px; position: relative; z-index: 1; }
          .auth-card { background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(24px) saturate(1.5); border: 1px solid rgba(51, 65, 85, 0.5); border-radius: 20px; padding: 32px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4); }
          .auth-submit-btn { width: 100%; padding: 13px 20px; color: #fff; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
          .auth-submit-btn:hover:not(:disabled) { background: rgba(71, 85, 105, 0.7) !important; }
          .auth-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
          .auth-spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
          .auth-error { display: flex; align-items: center; gap: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #f87171; padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; margin-bottom: 20px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .auth-switch { color: #3b82f6; font-weight: 600; cursor: pointer; border: none; transition: color 0.2s ease; }
          .auth-switch:hover { color: #60a5fa; text-decoration: underline; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <div className="auth-container" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}>
        {/* Logo & Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <h1 className="auth-title">{mode === 'login' ? t('auth.login') : t('auth.create_account')}</h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? t('auth.sign_in_subtitle')
              : t('auth.sign_up_subtitle')}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => { setMode('login'); resetForm(); }}
            type="button"
          >
            {t('auth.sign_in')}
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => { setMode('register'); resetForm(); }}
            type="button"
          >
            {t('auth.sign_up')}
          </button>
          <div
            className="auth-tab-indicator"
            style={{ transform: mode === 'register' ? 'translateX(100%)' : 'translateX(0)' }}
          />
        </div>

        {/* Form Card */}
        <div className="auth-card">
          <form onSubmit={handleSubmit} id="auth-form">
            {error && (
              <div className="auth-error" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {error}
              </div>
            )}

            {mode === 'register' && (
              <div className="auth-field">
                <label htmlFor="fullName" className="auth-label">{t('auth.full_name')}</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <input
                    id="fullName"
                    type="text"
                    className="auth-input"
                    placeholder={t('auth.full_name_placeholder')}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email" className="auth-label">{t('auth.email')}</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  id="email"
                  type="email"
                  className={`auth-input ${emailError ? 'has-error' : ''}`}
                  placeholder={t('auth.email_placeholder')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                  onBlur={handleEmailBlur}
                  required
                  autoComplete="email"
                />
              </div>
              {emailError && (
                <div style={{ color: '#f87171', fontSize: 13, marginTop: 6, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {emailError}
                </div>
              )}
            </div>

            <div className="auth-field">
              <label htmlFor="password" className="auth-label">{t('auth.password')}</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="auth-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="auth-toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {mode === 'login' && (
                <div style={{ textAlign: 'right', marginTop: '8px' }}>
                  <Link href="/forgot-password" style={{ color: '#3b82f6', fontSize: '13px', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s ease' }}>
                    {t('auth.forgot_password')}
                  </Link>
                </div>
              )}
            </div>

            {mode === 'register' && (
              <div className="auth-field">
                <label htmlFor="confirmPassword" className="auth-label">{t('auth.confirm_password')}</label>
                <div className="auth-input-wrap">
                  <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="auth-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
            )}

            <button
              id="auth-submit"
              type="submit"
              className="auth-submit-btn"
              disabled={loading || checkingEmail || !!emailError}
            >
              {loading || checkingEmail ? (
                <span className="auth-spinner" />
              ) : mode === 'login' ? (
                <>
                  {t('auth.sign_in')}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              ) : (
                <>
                  {t('auth.create_account')}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                    <circle cx="8.5" cy="7" r="4" />
                    <line x1="20" y1="8" x2="20" y2="14" />
                    <line x1="23" y1="11" x2="17" y2="11" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span>
              {mode === 'login' ? t('auth.no_account') : t('auth.have_account')}
            </span>
            <button type="button" className="auth-switch" onClick={toggleMode}>
              {mode === 'login' ? t('auth.sign_up') : t('auth.sign_in')}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050a18;
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        /* Animated background orbs */
        .auth-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.5;
          animation: float 8s ease-in-out infinite;
        }
        .auth-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(59, 130, 246, 0.25), transparent 70%);
          top: -150px;
          right: -100px;
          animation-delay: 0s;
        }
        .auth-orb-2 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(168, 85, 247, 0.2), transparent 70%);
          bottom: -120px;
          left: -80px;
          animation-delay: -3s;
        }
        .auth-orb-3 {
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(34, 197, 94, 0.12), transparent 70%);
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-delay: -5s;
        }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }

        .auth-container {
          width: 100%;
          max-width: 440px;
          position: relative;
          z-index: 1;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Header */
        .auth-header {
          text-align: center;
          margin-bottom: 28px;
        }
        .auth-logo {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: linear-gradient(135deg, #3b82f6, #8b5cf6);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          margin-bottom: 16px;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.35), 0 0 0 1px rgba(255,255,255,0.05);
          animation: pulse-glow 3s ease-in-out infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 8px 32px rgba(59, 130, 246, 0.35), 0 0 0 1px rgba(255,255,255,0.05); }
          50% { box-shadow: 0 8px 48px rgba(139, 92, 246, 0.45), 0 0 0 1px rgba(255,255,255,0.08); }
        }
        .auth-title {
          font-size: 26px;
          font-weight: 800;
          color: #f1f5f9;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
        }
        .auth-subtitle {
          font-size: 14px;
          color: #64748b;
          margin: 0;
        }

        /* Tab Switcher */
        .auth-tabs {
          display: flex;
          position: relative;
          background: rgba(15, 23, 42, 0.6);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          border: 1px solid rgba(51, 65, 85, 0.4);
        }
        .auth-tab {
          flex: 1;
          padding: 10px 16px;
          background: none;
          border: none;
          color: #64748b;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: color 0.3s ease;
          border-radius: 8px;
        }
        .auth-tab.active {
          color: #f1f5f9;
        }
        .auth-tab-indicator {
          position: absolute;
          top: 4px;
          left: 4px;
          width: calc(50% - 4px);
          height: calc(100% - 8px);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Card */
        .auth-card {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(24px) saturate(1.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 20px;
          padding: 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.03);
        }

        /* Error */
        .auth-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #f87171;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
          animation: shake 0.4s ease;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        /* Fields */
        .auth-field {
          margin-bottom: 18px;
        }
        .auth-label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #94a3b8;
          margin-bottom: 6px;
          letter-spacing: 0.01em;
        }
        .auth-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .auth-input-icon {
          position: absolute;
          left: 14px;
          color: #475569;
          pointer-events: none;
          transition: color 0.2s ease;
        }
        .auth-input-wrap:focus-within .auth-input-icon {
          color: #3b82f6;
        }
        .auth-input {
          width: 100%;
          padding: 12px 14px 12px 44px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(51, 65, 85, 0.6);
          border-radius: 10px;
          color: #f1f5f9;
          font-size: 14px;
          transition: all 0.25s ease;
          outline: none;
        }
        .auth-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15), 0 0 20px rgba(59, 130, 246, 0.08);
          background: rgba(15, 23, 42, 0.8);
        }
        .auth-input.has-error {
          border-color: #f87171;
          box-shadow: 0 0 0 1px rgba(248, 113, 113, 0.2);
        }
        .auth-input.has-error:focus {
          box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15), 0 0 20px rgba(248, 113, 113, 0.08);
        }
        .auth-input::placeholder {
          color: #334155;
        }
        .auth-toggle-pw {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: #475569;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
        }
        .auth-toggle-pw:hover {
          color: #94a3b8;
        }

        /* Submit Button */
        .auth-submit-btn {
          width: 100%;
          padding: 13px 20px;
          margin-top: 6px;
          background: linear-gradient(135deg, #3b82f6, #7c3aed);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 20px rgba(59, 130, 246, 0.35);
          position: relative;
          overflow: hidden;
        }
        .auth-submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.15), transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .auth-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 30px rgba(59, 130, 246, 0.45);
        }
        .auth-submit-btn:hover:not(:disabled)::before {
          opacity: 1;
        }
        .auth-submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .auth-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        /* Spinner */
        .auth-spinner {
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Footer */
        .auth-footer {
          text-align: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid rgba(51, 65, 85, 0.3);
          font-size: 13px;
          color: #64748b;
        }
        .auth-switch {
          background: none;
          border: none;
          color: #3b82f6;
          font-weight: 600;
          cursor: pointer;
          margin-left: 4px;
          font-size: 13px;
          transition: color 0.2s ease;
        }
        .auth-switch:hover {
          color: #60a5fa;
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .auth-card {
            padding: 24px 20px;
            border-radius: 16px;
          }
          .auth-title {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="auth-page"><span className="auth-spinner" /></div>}>
      <AuthPageContent />
    </Suspense>
  );
}
