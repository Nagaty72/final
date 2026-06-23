'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { validateName, validateGmail, validatePassword, getPasswordValidationRules } from '@/lib/validators';
import { Activity, Map as MapIcon, Bot, HeartPulse, TrendingUp, ShieldCheck } from 'lucide-react';

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
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // ── Validators ──────────────────────────────────────────────────────────
  // ── Validators are now imported from @/lib/validators ──

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem('ha_token');
    const savedUser = localStorage.getItem('ha_user');
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Only redirect to dashboard if the restored session is verified.
        // An unverified user with a stale token should land on /verify-email, not /dashboard.
        if (parsed?.is_verified === true) {
          router.push(parsed.role === 'normal_user' ? '/overview' : '/dashboard');
        }
      } catch {
        // Corrupt stored user — ignore and show login form
      }
    }
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
    setNameError('');
    setPasswordError('');
    setConfirmError('');
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

    if (mode === 'register') {
      const nErr = validateName(fullName);
      const eErr = validateGmail(email) || emailError;
      const pErr = validatePassword(password);
      const cErr = password !== confirmPassword ? 'Passwords do not match.' : '';
      setNameError(nErr);
      if (eErr && !emailError) setEmailError(eErr);
      setPasswordError(pErr);
      setConfirmError(cErr);
      if (nErr || eErr || pErr || cErr) return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        console.log('[RUNTIME] LOGIN_START for:', email);
        // Authenticate via Supabase
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (signInError) {
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            console.warn('[LOGIN] Unconfirmed email — redirecting to OTP verification');
            
            // Resend the signup OTP natively
            try {
              await supabase.auth.resend({
                type: 'signup',
                email
              });
            } catch (resendErr) {
              console.error('Failed to resend signup OTP:', resendErr);
            }
            
            setError('Please verify your email address before signing in. A new code has been sent.');
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);
            return;
          }
          throw signInError;
        }
        
        const { session, user } = data;
        console.log('[RUNTIME] LOGIN_SUCCESS for auth user:', user?.id);

        if (session) {
          localStorage.setItem('ha_token', session.access_token);
          
          let hydratedUser = user;
          try {
            console.log('[RUNTIME] Fetching profile from /api/v1/auth/me...');
            const profileRes = await authService.getMe();
            console.log('[RUNTIME] GET_ME_RESPONSE status:', profileRes ? 'Success' : 'Empty');
            if (profileRes?.data) {
              hydratedUser = profileRes.data;
              console.log('[RUNTIME] USER_PROFILE hydrated from backend:', JSON.stringify(hydratedUser));
            }
          } catch (profileErr) {
            console.error('[RUNTIME] GET_ME_RESPONSE Failed to hydrate role from backend:', profileErr);
            hydratedUser = { ...user, role: user.user_metadata?.role || 'normal_user' };
            console.log('[RUNTIME] USER_PROFILE fallback generated:', JSON.stringify(hydratedUser));
          }

          console.log('[RUNTIME] IS_VERIFIED_VALUE:', hydratedUser.is_verified);

          if (!hydratedUser.is_verified) {
            console.log('[RUNTIME] REDIRECT_TO_VERIFY_EMAIL (from Login page)');
            await supabase.auth.signOut();
            localStorage.removeItem('ha_token');
            try {
              await supabase.auth.resend({ type: 'signup', email });
            } catch { /* ignore */ }
            setError('Please verify your email address before signing in.');
            router.push(`/verify-email?email=${encodeURIComponent(email)}`);
            return;
          }

          console.log('[LOGIN] Verified user signed in:', hydratedUser.email);
          setAuthContext(hydratedUser, session.access_token, session.refresh_token);
          router.push(hydratedUser.role === 'normal_user' ? '/overview' : '/dashboard');
        }
      } else {
        // ── SIGNUP FLOW ────────────────────────────────────────────────────
        // Step 1: Create the account.
        // NOTE: With Supabase 'Confirm Email' ENABLED, signUp() automatically
        // sends the Confirm Signup email containing the {{ .Token }} OTP.
        console.log('[SIGNUP] Attempting account creation for:', email);
        console.log('[DIAGNOSTIC] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'UNDEFINED');
        console.log('[DIAGNOSTIC] EMAIL:', email);
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: 'normal_user'
            }
          }
        });

        if (signUpError) throw signUpError;
        console.log('[SIGNUP] Account created and OTP sent automatically by Supabase for:', email);

        // Step 2: Redirect to OTP entry screen
        router.push(
          `/verify-email?email=${encodeURIComponent(email)}&name=${encodeURIComponent(fullName)}`
        );
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailBlur = async () => {
    if (mode !== 'register' || !email) return;
    // Gmail check first
    const gmailErr = validateGmail(email);
    if (gmailErr) { setEmailError(gmailErr); return; }
    setCheckingEmail(true);
    setEmailError('');
    try {
      const res = await authService.checkEmail(email);
      if (res.data?.exists) setEmailError('This email is already in use.');
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
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '12px' }}>Verify your email</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: '1.6', marginBottom: '32px' }}>
              We&apos;ve sent a verification link to <strong style={{ color: '#e2e8f0' }}>{email}</strong>.
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
          .auth-page { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-primary); position: relative; overflow: hidden; padding: 24px; }
          .auth-orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; animation: float 8s ease-in-out infinite; }
          .auth-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(59, 130, 246, 0.25), transparent 70%); top: -150px; right: -100px; animation-delay: 0s; }
          .auth-orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(168, 85, 247, 0.2), transparent 70%); bottom: -120px; left: -80px; animation-delay: -3s; }
          .auth-orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(34, 197, 94, 0.12), transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); animation-delay: -5s; }
          @keyframes float { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -20px) scale(1.05); } 66% { transform: translate(-20px, 15px) scale(0.95); } }
          .auth-container { width: 100%; max-width: 440px; position: relative; z-index: 1; }
          .auth-card { background: var(--glass-bg); backdrop-filter: blur(24px) saturate(1.5); border: 1px solid var(--border); border-radius: 20px; padding: 32px; box-shadow: 0 20px 60px var(--shadow-color); }
          .auth-submit-btn { width: 100%; padding: 13px 20px; color: #fff; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
          .auth-submit-btn:hover:not(:disabled) { opacity: 0.88; }
          .auth-submit-btn:disabled { opacity: 0.7; cursor: not-allowed; }
          .auth-spinner { width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 0.7s linear infinite; }
          .auth-error { display: flex; align-items: center; gap: 8px; background: var(--danger-light); border: 1px solid var(--danger); color: var(--danger); padding: 10px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; margin-bottom: 20px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .auth-switch { color: var(--accent); font-weight: 600; cursor: pointer; border: none; background: none; transition: color 0.2s ease; }
          .auth-switch:hover { color: var(--accent-hover); text-decoration: underline; }
        `}</style>
      </div>
    );
  }

  // Field state helpers
  const fieldState = (err, val) => {
    if (!val) return '';
    return err ? 'has-error' : 'has-success';
  };

  return (
    <div className="auth-page">
      {/* ── LEFT SIDE: Authentication ── */}
      <div className="auth-left">
        <div className="auth-container" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}>

        {/* Back to Home — sits above the card, left-aligned */}
        <div style={{ marginBottom: 16 }}>
          <Link href="/" className="auth-back-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Epicare
          </Link>
        </div>

        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo-mobile">
            <img src="/logo.jpeg" alt="Epicare Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
                    className={`auth-input ${fieldState(nameError, fullName)}`}
                    placeholder="e.g. Ahmed Mohamed"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setNameError(validateName(e.target.value)); }}
                    required
                  />
                  {fullName && !nameError && <span className="auth-valid-icon">✓</span>}
                </div>
                {nameError && <div className="auth-field-error">{nameError}</div>}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="email" className="auth-label">
                {t('auth.email')}
                {mode === 'register' && <span style={{ color: '#64748b', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>Gmail only</span>}
              </label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  id="email"
                  type="email"
                  className={`auth-input ${mode === 'register' ? fieldState(emailError, email) : (emailError ? 'has-error' : '')}`}
                  placeholder={mode === 'register' ? 'you@gmail.com' : t('auth.email_placeholder')}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (mode === 'register') setEmailError(validateGmail(e.target.value));
                    else if (emailError) setEmailError('');
                  }}
                  onBlur={handleEmailBlur}
                  required
                  autoComplete="email"
                />
                {mode === 'register' && email && !emailError && <span className="auth-valid-icon">✓</span>}
              </div>
              {emailError && <div className="auth-field-error">{emailError}</div>}
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
                  className={`auth-input ${mode === 'register' ? fieldState(passwordError, password) : ''}`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (mode === 'register') {
                      setPasswordError(validatePassword(e.target.value));
                      if (confirmPassword) setConfirmError(e.target.value !== confirmPassword ? 'Passwords do not match.' : '');
                    }
                  }}
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                {mode === 'register' && password && !passwordError && <span className="auth-valid-icon" style={{ right: 40 }}>✓</span>}
                <button type="button" className="auth-toggle-pw" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
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
              {mode === 'register' && passwordError && <div className="auth-field-error">{passwordError}</div>}
              {mode === 'register' && password && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {Object.entries({
                    length: 'At least 8 characters',
                    uppercase: 'One uppercase letter',
                    number: 'One number',
                    special: 'One special character'
                  }).map(([key, label]) => {
                    const isValid = getPasswordValidationRules(password)[key];
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
                    className={`auth-input ${fieldState(confirmError, confirmPassword)}`}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setConfirmError(e.target.value !== password ? 'Passwords do not match.' : ''); }}
                    required
                    autoComplete="new-password"
                  />
                  {confirmPassword && !confirmError && <span className="auth-valid-icon">✓</span>}
                </div>
                {confirmError && <div className="auth-field-error">{confirmError}</div>}
              </div>
            )}

            <button
              id="auth-submit"
              type="submit"
              className="auth-submit-btn"
              disabled={loading || checkingEmail || !!emailError || (mode === 'register' && (!!nameError || !!passwordError || !!confirmError))}
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
      </div>

      {/* ── RIGHT SIDE: Healthcare Intelligence Showcase ── */}
      <div className="auth-right">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
        <div className="auth-orb auth-orb-4" />

        <div className="showcase-content">
          <div className="showcase-header">
            <div className="showcase-logo-wrap">
              <img src="/logo.jpeg" alt="Epicare Logo" className="showcase-logo-img" />
            </div>
            <h2 className="showcase-title">Epicare</h2>
          </div>
          
          <h3 className="showcase-tagline">National Health Intelligence Platform</h3>
          <p className="showcase-desc">
            Monitor disease trends, analyze outbreaks, visualize healthcare data, and generate intelligent health insights in real-time.
          </p>

          <div className="showcase-features">
            <div className="feature-card">
              <div className="fc-icon-wrap" style={{ color: '#3b82f6', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <TrendingUp size={20} />
              </div>
              <div className="fc-text">
                <h4>Real-Time Disease Analytics</h4>
                <p>Track epidemiological shifts instantly.</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="fc-icon-wrap" style={{ color: '#8b5cf6', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                <MapIcon size={20} />
              </div>
              <div className="fc-text">
                <h4>GIS Intelligence Mapping</h4>
                <p>Visualize regional outbreak densities.</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="fc-icon-wrap" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <Bot size={20} />
              </div>
              <div className="fc-text">
                <h4>AI Healthcare Analyst</h4>
                <p>Generate actionable intelligence reports.</p>
              </div>
            </div>
            <div className="feature-card">
              <div className="fc-icon-wrap" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <Activity size={20} />
              </div>
              <div className="fc-text">
                <h4>Smart Health Monitoring</h4>
                <p>Proactive alerting and surveillance.</p>
              </div>
            </div>
          </div>

          {/* Mini Dashboard Visual Preview */}
          <div className="showcase-dashboard">
            <div className="sd-header">
              <div className="sd-dot" style={{ background: '#ef4444' }} />
              <div className="sd-dot" style={{ background: '#f59e0b' }} />
              <div className="sd-dot" style={{ background: '#10b981' }} />
            </div>
            <div className="sd-body">
              <div className="sd-kpi-row">
                <div className="sd-kpi"><HeartPulse size={14} style={{ color: '#3b82f6', marginBottom: 6 }} /><div className="sd-bar" style={{ width: '40%' }} /><div className="sd-bar" style={{ width: '70%' }} /></div>
                <div className="sd-kpi"><ShieldCheck size={14} style={{ color: '#10b981', marginBottom: 6 }} /><div className="sd-bar" style={{ width: '50%' }} /><div className="sd-bar" style={{ width: '80%' }} /></div>
              </div>
              <div className="sd-chart">
                <div className="sd-chart-line" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          background: var(--bg-primary);
        }
        .auth-left {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 24px;
          background: var(--bg-primary);
          position: relative;
          z-index: 10;
        }
        .auth-right {
          --panel-bg: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          --panel-border: rgba(0,0,0,0.05);
          --title-gradient: linear-gradient(135deg, #0f172a, #334155);
          --tagline-color: #1e293b;
          --desc-color: #475569;
          --card-bg: rgba(255,255,255,0.6);
          --card-border: rgba(255,255,255,0.8);
          --card-hover-bg: rgba(255,255,255,0.9);
          --card-hover-border: rgba(0,0,0,0.1);
          --card-title: #0f172a;
          --card-text: #475569;
          --dash-bg: rgba(255,255,255,0.6);
          --dash-border: rgba(0,0,0,0.05);
          --dash-header: rgba(0,0,0,0.02);
          --dash-kpi: rgba(255,255,255,0.8);
          --dash-kpi-border: rgba(0,0,0,0.03);
          --dash-bar: rgba(0,0,0,0.05);
          --dash-chart: rgba(255,255,255,0.4);
          
          flex: 1.2;
          display: none;
          background: var(--panel-bg);
          position: relative;
          overflow: hidden;
          align-items: center;
          justify-content: center;
          border-left: 1px solid var(--panel-border);
        }
        :global(.dark) .auth-right {
          --panel-bg: #09090b;
          --panel-border: rgba(255,255,255,0.05);
          --title-gradient: linear-gradient(135deg, #fff, #a1a1aa);
          --tagline-color: #e4e4e7;
          --desc-color: #a1a1aa;
          --card-bg: rgba(255,255,255,0.03);
          --card-border: rgba(255,255,255,0.08);
          --card-hover-bg: rgba(255,255,255,0.06);
          --card-hover-border: rgba(255,255,255,0.15);
          --card-title: #e4e4e7;
          --card-text: #a1a1aa;
          --dash-bg: rgba(0,0,0,0.4);
          --dash-border: rgba(255,255,255,0.1);
          --dash-header: rgba(255,255,255,0.05);
          --dash-kpi: rgba(255,255,255,0.03);
          --dash-kpi-border: rgba(255,255,255,0.05);
          --dash-bar: rgba(255,255,255,0.1);
          --dash-chart: rgba(255,255,255,0.02);
        }
        @media (min-width: 1024px) {
          .auth-right {
            display: flex;
          }
        }

        /* Animated background orbs for Showcase */
        .auth-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
          animation: float 8s ease-in-out infinite;
          pointer-events: none;
        }
        .auth-orb-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(37, 99, 235, 0.2), transparent 70%); top: -100px; right: -100px; animation-delay: 0s; }
        .auth-orb-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(139, 92, 246, 0.2), transparent 70%); bottom: -100px; left: -100px; animation-delay: -3s; }
        .auth-orb-3 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(16, 185, 129, 0.15), transparent 70%); top: 40%; left: 40%; animation-delay: -5s; }
        .auth-orb-4 { width: 600px; height: 600px; background: radial-gradient(circle, rgba(6, 182, 212, 0.1), transparent 70%); bottom: 20%; right: -200px; animation-delay: -2s; }

        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }

        .auth-container {
          width: 100%;
          max-width: 420px;
          position: relative;
          transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Header */
        .auth-header {
          text-align: left;
          margin-bottom: 28px;
        }
        .auth-logo-mobile {
          width: 48px; height: 48px; border-radius: 12px;
          background: #fff; display: none; align-items: center; justify-content: center;
          margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden;
        }
        @media (max-width: 1023px) {
          .auth-logo-mobile { display: flex; }
        }
        .auth-title {
          font-size: 28px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 8px;
          letter-spacing: -0.03em;
          font-family: var(--font-display);
        }
        .auth-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0;
        }

        /* Tab Switcher */
        .auth-tabs {
          display: flex;
          position: relative;
          background: var(--bg-secondary);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 24px;
          border: 1px solid var(--border);
        }
        .auth-tab {
          flex: 1;
          padding: 10px 16px;
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          position: relative;
          z-index: 1;
          transition: color 0.3s ease;
          border-radius: 8px;
        }
        .auth-tab.active {
          color: var(--text-primary);
        }
        .auth-tab-indicator {
          position: absolute;
          top: 4px;
          left: 4px;
          width: calc(50% - 4px);
          height: calc(100% - 8px);
          background: var(--accent-light);
          border: 1px solid var(--accent);
          border-radius: 8px;
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }

        /* Card */
        .auth-card {
          background: var(--bg-primary);
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
          color: var(--text-secondary);
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
          color: var(--text-muted);
          pointer-events: none;
          transition: color 0.2s ease;
        }
        .auth-input-wrap:focus-within .auth-input-icon {
          color: var(--accent);
        }
        .auth-input {
          width: 100%;
          padding: 12px 14px 12px 44px;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text-primary);
          font-size: 14px;
          transition: all 0.25s ease;
          outline: none;
        }
        .auth-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-light);
          background: var(--bg-secondary);
        }
        .auth-input.has-error {
          border-color: var(--danger);
          box-shadow: 0 0 0 2px var(--danger-light);
        }
        .auth-input.has-error:focus {
          box-shadow: 0 0 0 3px var(--danger-light);
        }
        .auth-input.has-success {
          border-color: var(--success);
          box-shadow: 0 0 0 2px var(--success-light);
        }
        .auth-input.has-success:focus {
          box-shadow: 0 0 0 3px var(--success-light);
        }
        .auth-input::placeholder { color: var(--text-muted); }
        .auth-field-error {
          color: #f87171; font-size: 12px; margin-top: 5px;
          font-weight: 500; display: flex; align-items: center; gap: 4px;
        }
        .auth-field-hint {
          color: #22c55e; font-size: 12px; margin-top: 5px; font-weight: 600;
        }
        .auth-valid-icon {
          position: absolute; right: 14px;
          color: #22c55e; font-size: 14px; font-weight: 700; pointer-events: none;
        }
        .auth-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          letter-spacing: 0.02em;
          padding: 5px 12px 5px 9px;
          border-radius: 20px;
          background: var(--glass-bg);
          backdrop-filter: blur(8px);
          border: 1px solid var(--border);
          transition: color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .auth-back-link:hover {
          color: var(--text-primary);
          border-color: var(--accent);
          box-shadow: 0 0 12px var(--accent-glow);
        }
        .auth-toggle-pw {
          position: absolute;
          right: 12px;
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          transition: color 0.2s ease;
        }
        .auth-toggle-pw:hover {
          color: var(--text-secondary);
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
          border-top: 1px solid var(--border);
          font-size: 13px;
          color: var(--text-muted);
        }
        .auth-switch {
          background: none;
          border: none;
          color: var(--accent);
          font-weight: 600;
          cursor: pointer;
          margin-left: 4px;
          font-size: 13px;
          transition: color 0.2s ease;
        }
        .auth-switch:hover {
          color: var(--accent-hover);
          text-decoration: underline;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .auth-title { font-size: 24px; }
        }

        /* ── Showcase Styling ── */
        .showcase-content {
          position: relative;
          z-index: 10;
          max-width: 600px;
          padding: 60px;
        }
        .showcase-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }
        .showcase-logo-wrap {
          width: 56px; height: 56px; border-radius: 14px;
          background: #fff; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15); overflow: hidden;
        }
        .showcase-logo-img {
          width: 100%; height: 100%; object-fit: contain;
        }
        .showcase-title {
          font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.04em;
          font-family: var(--font-display);
          background: var(--title-gradient);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .showcase-tagline {
          font-size: 24px; font-weight: 700; margin: 0 0 16px; letter-spacing: -0.02em;
          color: var(--tagline-color); line-height: 1.3;
        }
        .showcase-desc {
          font-size: 16px; color: var(--desc-color); line-height: 1.6; margin: 0 0 40px; max-width: 480px;
        }
        
        .showcase-features {
          display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 48px;
        }
        .feature-card {
          background: var(--card-bg); border: 1px solid var(--card-border);
          border-radius: 16px; padding: 16px; display: flex; align-items: flex-start; gap: 14px;
          transition: all 0.3s ease; cursor: default;
        }
        .feature-card:hover {
          background: var(--card-hover-bg); border-color: var(--card-hover-border);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        }
        .fc-icon-wrap {
          width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .fc-text h4 { margin: 0 0 4px; font-size: 14px; font-weight: 700; color: var(--card-title); }
        .fc-text p { margin: 0; font-size: 13px; color: var(--card-text); line-height: 1.4; }

        .showcase-dashboard {
          background: var(--dash-bg); border: 1px solid var(--dash-border);
          border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          backdrop-filter: blur(12px);
        }
        :global(.dark) .showcase-dashboard {
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .sd-header {
          background: var(--dash-header); border-bottom: 1px solid var(--dash-border);
          padding: 10px 14px; display: flex; gap: 6px;
        }
        .sd-dot { width: 10px; height: 10px; border-radius: 50%; }
        .sd-body { padding: 20px; }
        .sd-kpi-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .sd-kpi { background: var(--dash-kpi); border: 1px solid var(--dash-kpi-border); border-radius: 8px; padding: 12px; }
        .sd-bar { height: 6px; border-radius: 3px; background: var(--dash-bar); margin-bottom: 8px; }
        .sd-chart { height: 80px; background: var(--dash-chart); border: 1px solid var(--dash-border); border-radius: 8px; position: relative; overflow: hidden; }
        .sd-chart-line { position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(180deg, rgba(59,130,246,0.2) 0%, transparent 100%); border-top: 2px solid #3b82f6; clip-path: polygon(0 60%, 20% 30%, 40% 50%, 60% 10%, 80% 40%, 100% 20%, 100% 100%, 0 100%); }
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
