'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/AuthContext';

/* ─── Core verification logic (needs Suspense wrapper for useSearchParams) ── */
// OTP_LENGTH must match Supabase Dashboard → Auth → Email OTP Expiry settings.
// Supabase default is 6 digits. Change only if explicitly configured otherwise.
const OTP_LENGTH = 6;

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: setAuthContext } = useAuth();

  const email = searchParams.get('email') || '';
  const name  = searchParams.get('name')  || '';

  // Dynamic OTP slots
  const [otp, setOtp]               = useState(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading]        = useState(false);
  const [resending, setResending]    = useState(false);
  const [error, setError]            = useState('');
  const [success, setSuccess]        = useState(false);
  const [cooldown, setCooldown]      = useState(60); // start at 60s — email just sent on signup
  const inputRefs                    = useRef([]);

  /* ── Countdown ────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  /* ── Focus first empty slot on mount ─────────────────────────────────── */
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  /* ── Redirect to login if no email param ─────────────────────────────── */
  useEffect(() => {
    if (!email) router.replace('/login');
  }, [email, router]);

  /* ── OTP input handlers ──────────────────────────────────────────────── */
  const handleOtpChange = (index, value) => {
    // Allow paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
      const next = [...otp];
      digits.forEach((d, i) => { if (index + i < OTP_LENGTH) next[index + i] = d; });
      setOtp(next);
      const focusIdx = Math.min(index + digits.length, OTP_LENGTH - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const digit = value.replace(/\D/g, '');
    const next  = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        const next = [...otp]; next[index] = ''; setOtp(next);
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text   = e.clipboardData.getData('text');
    const digits = text.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
    const next   = Array(OTP_LENGTH).fill('');
    digits.forEach((d, i) => { next[i] = d; });
    setOtp(next);
    const focusIdx = Math.min(digits.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  /* ── Verify OTP ──────────────────────────────────────────────────────── */
  const handleVerify = async (e) => {
    e?.preventDefault();
    const code = otp.join('');
    if (code.length < OTP_LENGTH) {
      setError(`Please enter the complete ${OTP_LENGTH}-digit code.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('[OTP_VERIFY_START] email:', email, '[OTP_LENGTH]:', code.length);
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'signup',
      });

      if (verifyError) throw verifyError;
      
      console.log('[OTP_VERIFY_SUCCESS] session uid:', data?.session?.user?.id);
      console.log('[EMAIL_CONFIRMATION_STATUS] email_confirmed_at:', data?.session?.user?.email_confirmed_at || data?.user?.email_confirmed_at);

      const { session, user } = data;

      if (session) {
        localStorage.setItem('ha_token', session.access_token);

        // Step 1: Frontend insert removed.
        // The backend auth.middleware.js already automatically creates the user row (lazy sync)
        // and updates is_verified to true (auto-heal) using the service-role key when we call /auth/me.
        // Direct inserts from the frontend here violate RLS.

        // ── Step 2: Hydrate full profile from backend ────────────────────────────
        // Backend middleware auto-heals is_verified via email_confirmed_at (service-role key),
        // so this call will succeed even if the client-side write above was RLS-blocked.
        let hydratedUser;
        try {
          console.log('[PROFILE_HYDRATE_START] Calling /api/v1/auth/me...');
          const profileRes = await authService.getMe();
          console.log('[PROFILE_HYDRATE_RESPONSE]', JSON.stringify(profileRes?.data));
          if (profileRes?.data) {
            hydratedUser = { ...profileRes.data, is_verified: true };
            console.log('[PROFILE_HYDRATE_SUCCESS]', JSON.stringify(hydratedUser));
          } else {
            throw new Error('Empty profile response from /auth/me');
          }
        } catch (profileErr) {
          const errMsg = profileErr?.message || '';
          console.error('[PROFILE_HYDRATE_ERROR]', errMsg);
          // If the backend explicitly rejects with EMAIL_NOT_VERIFIED, stop and surface the error.
          if (errMsg.includes('EMAIL_NOT_VERIFIED') || errMsg.toLowerCase().includes('not verified') || errMsg.includes('verify your email')) {
            setError('Email verified with Supabase but backend sync is still pending. Please wait a moment and try again, or contact support.');
            setLoading(false);
            return;
          }
          // For transient network errors, fall back gracefully with local user data.
          hydratedUser = {
            ...user,
            role: user?.user_metadata?.role || 'normal_user',
            is_verified: true,
          };
        }

        setAuthContext(hydratedUser, session.access_token, session.refresh_token);
        console.log('[AUTHCONTEXT_RESTORE] setAuthContext called — is_verified:', hydratedUser.is_verified, 'email:', hydratedUser.email);
        setSuccess(true);

        // Short pause so user sees success state, then navigate
        setTimeout(() => router.push('/dashboard'), 1800);
      }
    } catch (err) {
      const msg = err.message || '';
      console.error('[OTP_VERIFY_ERROR] Verification failed for:', email, '—', msg);
      if (msg.toLowerCase().includes('expired')) {
        setError('This code has expired. Please request a new one.');
      } else if (msg.toLowerCase().includes('invalid')) {
        setError('Incorrect code. Please check and try again.');
      } else {
        setError(msg || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ──────────────────────────────────────────────────────── */
  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');

    try {
      // Resend the signup OTP natively
      console.log('[OTP] Resending signup OTP to:', email);
      const { error: otpError } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (otpError) throw otpError;
      console.log('[OTP] Resend successful for:', email);
      setOtp(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setCooldown(60);
    } catch (err) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  /* ── Auto-submit when all 6 digits filled ────────────────────────────── */
  useEffect(() => {
    if (otp.every(d => d !== '') && !loading && !success) {
      handleVerify();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  const otpValue = otp.join('');
  const isFilled = otpValue.length === OTP_LENGTH;

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="vep-page">
      {/* Background orbs */}
      <div className="vep-orb vep-orb-1" />
      <div className="vep-orb vep-orb-2" />
      <div className="vep-orb vep-orb-3" />

      <div className="vep-card-wrap">
        {/* Back link */}
        <div style={{ marginBottom: 20 }}>
          <Link href="/login" className="vep-back-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Sign In
          </Link>
        </div>

        <div className="vep-card">
          {success ? (
            /* ── Success State ── */
            <div className="vep-success">
              <div className="vep-success-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="vep-title" style={{ color: 'var(--success)' }}>Email Verified!</h2>
              <p className="vep-subtitle">Welcome to Epicare, {name || 'there'}. Redirecting you to your dashboard…</p>
              <div className="vep-spinner-wrap">
                <span className="vep-spinner" style={{ borderTopColor: 'var(--success)' }} />
              </div>
            </div>
          ) : (
            /* ── OTP Input State ── */
            <>
              {/* Icon */}
              <div className="vep-icon-wrap">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>

              {/* Heading */}
              <h1 className="vep-title">Check your email</h1>
              <p className="vep-subtitle">
                We sent a {OTP_LENGTH}-digit verification code to<br />
                <strong className="vep-email">{email}</strong>
              </p>

              {/* Error banner */}
              {error && (
                <div className="vep-error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                  {error}
                </div>
              )}

              {/* OTP Inputs */}
              <form onSubmit={handleVerify} className="vep-form">
                <div className="vep-otp-row" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => inputRefs.current[i] = el}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={OTP_LENGTH}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={`vep-otp-input${digit ? ' filled' : ''}${error ? ' has-error' : ''}`}
                      aria-label={`Digit ${i + 1}`}
                      autoComplete="one-time-code"
                      disabled={loading || success}
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="vep-submit-btn"
                  disabled={loading || !isFilled || success}
                >
                  {loading ? (
                    <span className="vep-spinner" />
                  ) : (
                    <>
                      Verify Email
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                    </>
                  )}
                </button>
              </form>

              {/* Resend */}
              <div className="vep-resend-row">
                <span className="vep-resend-label">Didn't receive the code?</span>
                <button
                  onClick={handleResend}
                  disabled={cooldown > 0 || resending}
                  className="vep-resend-btn"
                >
                  {resending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>

              <p className="vep-hint">
                Check your spam folder if you don't see the email within a minute.
              </p>
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .vep-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        /* Animated orbs */
        .vep-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.45;
          animation: vep-float 9s ease-in-out infinite;
          pointer-events: none;
        }
        .vep-orb-1 { width: 520px; height: 520px; background: radial-gradient(circle, rgba(37, 99, 235, 0.22), transparent 70%); top: -140px; right: -100px; animation-delay: 0s; }
        .vep-orb-2 { width: 420px; height: 420px; background: radial-gradient(circle, rgba(139, 92, 246, 0.18), transparent 70%); bottom: -100px; left: -80px; animation-delay: -4s; }
        .vep-orb-3 { width: 280px; height: 280px; background: radial-gradient(circle, rgba(16, 185, 129, 0.14), transparent 70%); top: 50%; left: 50%; transform: translate(-50%,-50%); animation-delay: -7s; }
        @keyframes vep-float {
          0%, 100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(28px,-18px) scale(1.04); }
          66% { transform: translate(-18px,14px) scale(0.96); }
        }

        /* Card wrapper */
        .vep-card-wrap {
          width: 100%;
          max-width: 560px;
          position: relative;
          z-index: 1;
          animation: vep-rise 0.5s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes vep-rise {
          from { opacity:0; transform: translateY(24px); }
          to   { opacity:1; transform: translateY(0); }
        }

        /* Back link */
        .vep-back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
        }
        .vep-back-link:hover { color: var(--text-primary); }

        /* Card */
        .vep-card {
          background: var(--glass-bg, rgba(24, 24, 27, 0.7));
          backdrop-filter: blur(32px) saturate(1.5);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 48px 44px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.03), 0 30px 80px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          text-align: center;
        }

        /* Icon */
        .vep-icon-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(124, 58, 237, 0.1));
          border: 1px solid rgba(37, 99, 235, 0.25);
          color: var(--accent, #3b82f6);
          margin-bottom: 24px;
        }

        /* Text */
        .vep-title {
          font-size: 26px;
          font-weight: 800;
          color: var(--text-primary);
          margin: 0 0 10px;
          letter-spacing: -0.025em;
          font-family: var(--font-display, inherit);
        }
        .vep-subtitle {
          font-size: 15px;
          color: var(--text-muted);
          margin: 0 0 32px;
          line-height: 1.6;
        }
        .vep-email {
          color: var(--text-primary);
          font-weight: 600;
        }
        .vep-hint {
          font-size: 13px;
          color: var(--text-muted);
          margin: 20px 0 0;
          opacity: 0.7;
        }

        /* Error */
        .vep-error {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.25);
          color: #f87171;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 24px;
          text-align: left;
        }

        /* OTP inputs */
        .vep-form { width: 100%; }
        .vep-otp-row {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-bottom: 32px;
        }
        .vep-otp-input {
          width: 52px;
          height: 64px;
          text-align: center;
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          background: rgba(0, 0, 0, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s, background 0.2s;
          caret-color: var(--accent, #3b82f6);
          font-family: var(--font-display, monospace);
        }
        .vep-otp-input:focus {
          border-color: var(--accent, #3b82f6);
          background: rgba(37, 99, 235, 0.05);
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15), 0 0 20px rgba(37, 99, 235, 0.2);
          transform: translateY(-2px);
        }
        .vep-otp-input.filled {
          border-color: rgba(37, 99, 235, 0.4);
          background: rgba(37, 99, 235, 0.08);
        }
        .vep-otp-input.has-error {
          border-color: rgba(239, 68, 68, 0.6);
          box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.1);
          animation: vep-shake 0.35s ease;
        }
        @keyframes vep-shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .vep-otp-input:disabled { opacity: 0.6; cursor: not-allowed; }

        @media (max-width: 600px) {
          .vep-card { padding: 40px 24px; }
          .vep-otp-row { gap: 8px; }
          .vep-otp-input { width: 42px; height: 52px; font-size: 22px; border-radius: 12px; }
        }
        @media (max-width: 440px) {
          .vep-otp-row { gap: 6px; }
          .vep-otp-input { width: 36px; height: 48px; font-size: 20px; border-radius: 10px; }
          .vep-title { font-size: 22px; }
          .vep-subtitle { font-size: 14px; }
        }

        /* Submit button */
        .vep-submit-btn {
          width: 100%;
          padding: 13px 20px;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
        }
        .vep-submit-btn:hover:not(:disabled) { opacity: 0.88; transform: translateY(-1px); }
        .vep-submit-btn:active:not(:disabled) { transform: translateY(0); }
        .vep-submit-btn:disabled { opacity: 0.55; cursor: not-allowed; }

        /* Spinner */
        .vep-spinner {
          display: inline-block;
          width: 20px;
          height: 20px;
          border: 2.5px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: vep-spin 0.7s linear infinite;
          flex-shrink: 0;
        }
        @keyframes vep-spin { to { transform: rotate(360deg); } }

        /* Resend */
        .vep-resend-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        .vep-resend-label { font-size: 13px; color: var(--text-muted); }
        .vep-resend-btn {
          font-size: 13px;
          font-weight: 600;
          color: var(--accent, #3b82f6);
          background: none;
          border: none;
          cursor: pointer;
          transition: color 0.2s, opacity 0.2s;
          padding: 0;
        }
        .vep-resend-btn:hover:not(:disabled) { text-decoration: underline; }
        .vep-resend-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Success state */
        .vep-success { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 8px 0; }
        .vep-success-icon {
          width: 72px;
          height: 72px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.12);
          border: 2px solid rgba(16, 185, 129, 0.3);
          color: var(--success, #10b981);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: vep-pop 0.4s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes vep-pop {
          from { transform: scale(0.6); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
        .vep-spinner-wrap { margin-top: 8px; }
      `}</style>
    </div>
  );
}

/* ─── Page export with Suspense (required for useSearchParams in Next.js) ─── */
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ width: 28, height: 28, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
