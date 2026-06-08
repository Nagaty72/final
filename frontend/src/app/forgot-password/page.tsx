'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize cooldown from localStorage on load
    const lastSent = localStorage.getItem('forgot_password_last_sent');
    if (lastSent) {
      const elapsed = Math.floor((Date.now() - parseInt(lastSent)) / 1000);
      if (elapsed < 60) {
        setCooldown(60 - elapsed);
      } else {
        localStorage.removeItem('forgot_password_last_sent');
      }
    }
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            localStorage.removeItem('forgot_password_last_sent');
            setError(''); // Ensure rate limit message goes away
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || cooldown > 0) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        throw resetError;
      }

      setSuccess("We've sent a password reset link to your email. Please check your inbox and spam folder.");
      setCooldown(60);
      localStorage.setItem('forgot_password_last_sent', Date.now().toString());
    } catch (err: any) {
      let errorMessage = err.message || 'Something went wrong. Please try again.';
      
      if (errorMessage.toLowerCase().includes('rate limit')) {
        errorMessage = 'Too many reset attempts. Please wait a minute before trying again.';
        setCooldown(60);
        localStorage.setItem('forgot_password_last_sent', Date.now().toString());
      }
      
      setError(errorMessage);
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
          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Enter your email to receive a reset link
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
              <label htmlFor="email" className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <svg className="auth-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <input
                  id="email"
                  type="email"
                  className="auth-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <button
              id="auth-submit"
              type="submit"
              className="auth-submit-btn"
              disabled={loading || cooldown > 0}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : cooldown > 0 ? (
                `Resend in ${cooldown}s`
              ) : (
                <>
                  Send Reset Link
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <Link href="/login" className="auth-switch" style={{ marginLeft: 0 }}>
              Back to Sign In
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
          background: var(--bg-primary, rgba(255, 255, 255, 0.05));
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
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.2));
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
