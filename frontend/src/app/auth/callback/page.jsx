'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { authService } from '@/services/auth.service';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login: setAuthContext } = useAuth();
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    let isMounted = true;

    const verifyCode = async () => {
      const code = searchParams.get('code');
      
      if (!code) {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          if (isMounted) {
            setError('Verification link is invalid or has expired.');
            setMessage('');
          }
        } else {
          handleSuccess(session);
        }
        return;
      }

      try {
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
        
        if (data?.session) {
          handleSuccess(data.session);
        } else {
          throw new Error('Failed to retrieve session.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        if (isMounted) {
          setError(err.message || 'Verification failed. Please try again or request a new link.');
          setMessage('');
        }
      }
    };

    const handleSuccess = async (session) => {
      if (!isMounted) return;
      
      localStorage.setItem('ha_token', session.access_token);
      
      let hydratedUser = session.user;
      try {
        const profileRes = await authService.getMe();
        if (profileRes?.data) {
          hydratedUser = profileRes.data;
        }
      } catch (profileErr) {
        console.error('Failed to hydrate role from backend:', profileErr);
        hydratedUser = { ...session.user, role: session.user.user_metadata?.role || 'normal_user' };
      }

      setAuthContext(hydratedUser, session.access_token, session.refresh_token);
      
      setMessage('Email verified successfully! Redirecting...');
      
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);
    };

    verifyCode();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams, setAuthContext]);

  return (
    <div className="callback-card">
      {error ? (
        <>
          <div className="icon-error">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 className="title error">Verification Failed</h1>
          <p className="subtitle">{error}</p>
          <button onClick={() => router.push('/login')} className="btn">
            Return to Login
          </button>
        </>
      ) : (
        <>
          <div className="icon-success">
            <span className="spinner" />
          </div>
          <h1 className="title">Verifying</h1>
          <p className="subtitle">{message}</p>
        </>
      )}
    </div>
  );
}

export default function AuthCallback() {
  return (
    <div className="callback-page">
      <Suspense fallback={<div className="callback-card"><span className="spinner" /></div>}>
        <AuthCallbackContent />
      </Suspense>

      <style jsx>{`
        .callback-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #050a18;
          padding: 20px;
        }
        .callback-card {
          background: rgba(15, 23, 42, 0.75);
          backdrop-filter: blur(24px) saturate(1.5);
          border: 1px solid rgba(51, 65, 85, 0.5);
          border-radius: 20px;
          padding: 40px;
          text-align: center;
          max-width: 400px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
        }
        .icon-error {
          color: #f87171;
          margin-bottom: 20px;
          display: flex;
          justify-content: center;
        }
        .icon-success {
          margin-bottom: 24px;
          display: flex;
          justify-content: center;
        }
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #f1f5f9;
          margin-bottom: 12px;
        }
        .title.error {
          color: #f87171;
        }
        .subtitle {
          color: #94a3b8;
          font-size: 15px;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .btn {
          width: 100%;
          padding: 12px 20px;
          background: linear-gradient(135deg, #3b82f6, #7c3aed);
          color: #fff;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .spinner {
          display: block;
          width: 40px;
          height: 40px;
          border: 3px solid rgba(59, 130, 246, 0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
