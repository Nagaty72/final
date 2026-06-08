'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    const initializeSession = async () => {
      let sessionEstablished = false;

      console.log('[DEBUG] URL Search:', window.location.search);
      console.log('[DEBUG] URL Hash:', window.location.hash);

      // 1. Check for PKCE 'code' in query params
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get('code');

      if (code) {
        console.log('[DEBUG] Exchanging code for session...');
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        console.log('[DEBUG] Exchange result:', { data, exchangeError });
        if (!exchangeError && data?.session) {
          sessionEstablished = true;
        }
      }

      // 2. Check for implicit flow tokens in URL hash (e.g. #access_token=...&refresh_token=...&type=recovery)
      if (!sessionEstablished && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const type = hashParams.get('type');

        console.log('[DEBUG] Hash params found. Type:', type);

        if (accessToken && refreshToken && type === 'recovery') {
          console.log('[DEBUG] Setting session from hash...');
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          console.log('[DEBUG] Set session result:', { data, setSessionError });
          if (!setSessionError && data?.session) {
            sessionEstablished = true;
          }
        }
      }

      // 3. Fallback: check if Supabase automatically established the session
      if (!sessionEstablished) {
        console.log('[DEBUG] Checking fallback getSession()...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('[DEBUG] Fallback getSession result:', { session, sessionError });
        if (session) {
          sessionEstablished = true;
        }
      }

      if (!sessionEstablished) {
        console.log('[DEBUG] No session could be established.');
        setError('Invalid or expired recovery link. Please request a new one.');
      } else {
        console.log('[DEBUG] Session successfully established. Ready for password update.');
        // Clear URL hash/search to prevent token leaking or reuse
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    // Slight delay to allow Supabase to process any built-in hash/code exchanges
    setTimeout(() => {
      initializeSession();
    }, 500);

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[DEBUG] onAuthStateChange event:', event, 'Session:', !!session);
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setError('');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Ensure we have a session before updating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Invalid or expired recovery link. Please request a new one.');
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess('Password updated successfully. Redirecting to login...');

      // Clear the recovery session so they log in fresh
      await supabase.auth.signOut();

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="auth-page">
      {/* Animated background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      <div className="auth-container" style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(20px)' }}>
        {/* Header */}
        <div className="auth-header">
          <div className="auth-logo">
            <img src="/logo.jpeg" alt="Epicare Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h1 className="auth-title">Update Password</h1>
          <p className="auth-subtitle">
            Please enter your new password below
          </p>
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
            {success && (
              <div className="auth-success" role="alert">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {success}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="password" className="auth-label">New Password</label>
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
                  minLength={8}
                />
                <button
                  type="button"
                  className="auth-toggle-pw"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
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
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
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
                />
              </div>
            </div>

            <button
              id="auth-submit"
              type="submit"
              className="auth-submit-btn"
              disabled={loading || !!success}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                <>
                  Update Password
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <Link href="/login" className="auth-switch" style={{ marginLeft: 0 }}>
              Cancel
            </Link>
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
          width: 100px;
          height: 100px;
          border-radius: 24px;
          background: var(--bg-primary, rgba(0, 0, 0, 0.05));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          box-shadow: 0 8px 32px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(255,255,255,0.1);
          animation: pulse-glow 3s ease-in-out infinite;
          overflow: hidden;
          transition: all 0.3s ease;
        }
        .auth-logo img {
          filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.2));
        }
        :global(.dark) .auth-logo img {
          filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.5));
        }
        :global(.dark) .auth-logo {
          box-shadow: 0 8px 32px rgba(255, 255, 255, 0.15), 0 0 0 1px rgba(255,255,255,0.1);
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

        .auth-success {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          color: #4ade80;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 20px;
          animation: fadeIn 0.4s ease;
        }
        @keyframes fadeIn {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
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
          text-decoration: none;
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
