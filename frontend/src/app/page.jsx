'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'next-themes';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { theme, resolvedTheme } = useTheme();
  const { user, loading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isRTL = i18n.language === 'ar';

  return (
    <div className="landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navbar */}
      <nav className="landing-nav">
        <div className="container">
          <div className="nav-content">
            <Link href="/" className="logo">
              <div className="logo-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </div>
              <span className="logo-text">{t('landing.nav_platform')}</span>
            </Link>

            <div className="nav-links">
              <a href="#features" className="nav-link-item">{t('landing.nav_features')}</a>
              <a href="#how-it-works" className="nav-link-item">{t('landing.nav_how')}</a>
            </div>

            <div className="nav-actions">
              <ThemeToggle />
              <LanguageSwitcher />
              
              {!loading && (
                user ? (
                  <Link href="/dashboard" className="btn-primary nav-btn">
                    {t('landing.nav_dashboard')}
                  </Link>
                ) : (
                  <>
                    <Link href="/login" className="nav-link-item login-link">
                      {t('landing.nav_login')}
                    </Link>
                    <Link href="/login?mode=signup" className="btn-primary nav-btn">
                      {t('landing.nav_signup')}
                    </Link>
                  </>
                )
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-bg-glow"></div>
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge fade-in">
              <span className="badge purple">{t('landing.nav_platform')} v2.0</span>
            </div>
            <h1 className="hero-title fade-in">
              {t('landing.hero_title')}
            </h1>
            <p className="hero-subtitle fade-in">
              {t('landing.hero_subtitle')}
            </p>
            <div className="hero-ctas fade-in">
              <Link href="/login?mode=signup" className="btn-primary btn-lg">
                {t('landing.hero_cta')}
              </Link>
              <a href="#features" className="btn-secondary btn-lg">
                {t('landing.hero_explore')}
              </a>
            </div>

            <div className="hero-stats fade-in">
              <div className="hero-stat-item">
                <span className="stat-val">450+</span>
                <span className="stat-lab">{t('landing.hero_stat_hospitals')}</span>
              </div>
              <div className="hero-stat-item">
                <span className="stat-val">2.5M+</span>
                <span className="stat-lab">{t('landing.hero_stat_records')}</span>
              </div>
              <div className="hero-stat-item">
                <span className="stat-val">99.9%</span>
                <span className="stat-lab">{t('landing.hero_stat_uptime')}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Dashboard Preview */}
        <div className="hero-preview-container fade-in">
           <div className="dashboard-mockup glass-card">
              <div className="mockup-header">
                 <div className="dots"><span></span><span></span><span></span></div>
                 <div className="address-bar">health-analytics.gov.eg</div>
              </div>
              <div className="mockup-content">
                 <div className="mock-sidebar"></div>
                 <div className="mock-main">
                    <div className="mock-charts">
                       <div className="mock-chart"></div>
                       <div className="mock-chart"></div>
                    </div>
                    <div className="mock-map">
                       <div className="mock-map-inner">
                          <div className="pulse-marker" style={{ top: '40%', left: '50%' }}></div>
                          <div className="pulse-marker" style={{ top: '60%', left: '45%' }}></div>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('landing.features_title')}</h2>
            <p className="section-subtitle">{t('landing.features_subtitle')}</p>
          </div>

          <div className="features-grid">
            {[
              { id: 'gis', icon: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
              { id: 'disease', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
              { id: 'ai', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
              { id: 'nearby', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
              { id: 'realtime', icon: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
              { id: 'dashboards', icon: 'M3 3h18v18H3z M3 9h18 M9 21V9' }
            ].map(feat => (
              <div key={feat.id} className="feature-card glass-card">
                <div className="feat-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={feat.icon} />
                  </svg>
                </div>
                <h3 className="feat-title">{t(`landing.feat_${feat.id}`)}</h3>
                <p className="feat-desc">{t(`landing.feat_${feat.id}_desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="how-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">{t('landing.how_title')}</h2>
            <p className="section-subtitle">{t('landing.how_subtitle')}</p>
          </div>

          <div className="steps-container">
            {[1, 2, 3].map(step => (
              <div key={step} className="step-item">
                <div className="step-number">{step}</div>
                <h3 className="step-title">{t(`landing.how_step${step}_title`)}</h3>
                <p className="step-desc">{t(`landing.how_step${step}_desc`)}</p>
                {step < 3 && <div className="step-arrow"></div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-glass glass-card">
            <div className="stats-grid">
               {[
                 { id: 'governorates', val: '27' },
                 { id: 'cases', val: '1.2M' },
                 { id: 'accuracy', val: '94%' },
                 { id: 'response', val: '3.5x' }
               ].map(s => (
                 <div key={s.id} className="stat-block">
                    <div className="stat-val-large">{s.val}</div>
                    <div className="stat-label-large">{t(`landing.stats_${s.id}`)}</div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-banner-section">
        <div className="container">
          <div className="cta-banner glass-card">
            <div className="cta-content">
              <h2 className="cta-title">{t('landing.cta_title')}</h2>
              <p className="cta-subtitle">{t('landing.cta_subtitle')}</p>
              <Link href="/login?mode=signup" className="btn-primary btn-xl">
                {t('landing.cta_button')}
              </Link>
            </div>
            <div className="cta-visual">
               <div className="floating-elements">
                  <div className="float-box glass-card one"></div>
                  <div className="float-box glass-card two"></div>
                  <div className="float-box glass-card three"></div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="logo">
                <div className="logo-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <span className="logo-text">{t('landing.nav_platform')}</span>
              </div>
              <p className="footer-about-text">{t('landing.footer_desc')}</p>
            </div>

            <div className="footer-links">
              <div className="link-group">
                <h4>{t('landing.footer_product')}</h4>
                <a href="#features">{t('landing.nav_features')}</a>
                <a href="#how-it-works">{t('landing.nav_how')}</a>
                <Link href="/login">{t('landing.nav_login')}</Link>
              </div>
              <div className="link-group">
                <h4>{t('landing.footer_company')}</h4>
                <a href="#">{t('landing.footer_about')}</a>
                <a href="#">{t('landing.footer_careers')}</a>
                <a href="#">{t('landing.footer_blog')}</a>
              </div>
              <div className="link-group">
                <h4>{t('landing.footer_contact')}</h4>
                <a href="#">support@healthanalytics.gov.eg</a>
                <a href="#">+20 2 1234567</a>
                <div className="social-links">
                   {/* Icons for social */}
                </div>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p>© 2026 {t('landing.nav_platform')}. {t('landing.footer_rights')}</p>
            <div className="legal-links">
              <a href="#">{t('landing.footer_privacy')}</a>
              <a href="#">{t('landing.footer_terms')}</a>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 24px;
          width: 100%;
        }

        /* Navbar */
        .landing-nav {
          height: 80px;
          display: flex;
          align-items: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: var(--glass-bg);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .nav-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: var(--text-primary);
        }
        .logo-icon {
          width: 36px;
          height: 36px;
          background: var(--accent);
          color: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-text {
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .nav-links {
          display: flex;
          gap: 32px;
        }
        @media (max-width: 768px) { .nav-links { display: none; } }
        .nav-link-item {
          text-decoration: none;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 14.5px;
          transition: color 0.2s;
        }
        .nav-link-item:hover { color: var(--accent); }
        .nav-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .nav-btn {
          padding: 8px 20px !important;
          font-size: 14px !important;
        }

        /* Hero */
        .hero-section {
          padding: 160px 0 80px;
          position: relative;
          overflow: hidden;
          background: radial-gradient(circle at 50% 0%, var(--accent-light), transparent 70%);
        }
        .hero-bg-glow {
          position: absolute;
          top: -20%;
          left: 50%;
          transform: translateX(-50%);
          width: 80%;
          height: 80%;
          background: radial-gradient(circle, var(--purple-light), transparent 70%);
          opacity: 0.4;
          z-index: -1;
        }
        .hero-content {
          text-align: center;
          max-width: 800px;
          margin: 0 auto;
        }
        .hero-badge {
          margin-bottom: 24px;
        }
        .hero-title {
          font-size: 64px;
          font-weight: 800;
          line-height: 1.1;
          margin-bottom: 24px;
          letter-spacing: -2px;
          background: linear-gradient(to bottom, var(--text-primary), var(--text-secondary));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        @media (max-width: 768px) { .hero-title { font-size: 40px; } }
        .hero-subtitle {
          font-size: 20px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 40px;
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }
        .hero-ctas {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 64px;
        }
        .btn-lg { padding: 14px 32px; font-size: 16px; }
        .btn-xl { padding: 16px 40px; font-size: 18px; }
        .btn-secondary {
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-radius: var(--radius-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .btn-secondary:hover { background: var(--bg-card-hover); border-color: var(--accent); }

        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 48px;
          padding-top: 48px;
          border-top: 1px solid var(--border);
        }
        .hero-stat-item { display: flex; flexDirection: column; align-items: center; }
        .stat-val { font-size: 32px; font-weight: 800; color: var(--accent); letter-spacing: -1px; }
        .stat-lab { font-size: 14px; color: var(--text-muted); font-weight: 500; }

        /* Dashboard Mockup */
        .hero-preview-container {
           margin-top: 80px;
           perspective: 1000px;
        }
        .dashboard-mockup {
           max-width: 1000px;
           margin: 0 auto;
           height: 500px;
           border-radius: 20px;
           overflow: hidden;
           transform: rotateX(10deg);
           box-shadow: 0 30px 60px var(--shadow-color);
        }
        .mockup-header {
           height: 40px;
           background: var(--bg-card-hover);
           display: flex;
           align-items: center;
           padding: 0 16px;
           gap: 16px;
        }
        .mockup-header .dots { display: flex; gap: 6px; }
        .mockup-header .dots span { width: 8px; height: 8px; border-radius: 50%; background: #94a3b8; }
        .address-bar { flex: 1; background: var(--bg-card); height: 24px; border-radius: 6px; font-size: 10px; display: flex; align-items: center; padding: 0 10px; color: var(--text-muted); }
        .mockup-content { display: flex; height: calc(100% - 40px); }
        .mock-sidebar { width: 60px; background: var(--sidebar-bg); border-right: 1px solid var(--border); }
        .mock-main { flex: 1; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
        .mock-charts { display: flex; gap: 20px; height: 100px; }
        .mock-chart { flex: 1; background: var(--bg-card-hover); border-radius: 10px; }
        .mock-map { flex: 1; background: var(--bg-card-hover); border-radius: 10px; position: relative; }
        .mock-map-inner { width: 100%; height: 100%; opacity: 0.3; background: url('https://upload.wikimedia.org/wikipedia/commons/e/e3/Egypt_location_map.svg') no-repeat center/contain; }
        .pulse-marker { position: absolute; width: 12px; height: 12px; background: var(--accent); border-radius: 50%; animation: pulse-marker 2s infinite; }
        @keyframes pulse-marker { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }

        /* Sections */
        .features-section, .how-section, .cta-banner-section { padding: 100px 0; }
        .section-header { text-align: center; max-width: 700px; margin: 0 auto 64px; }
        .section-title { font-size: 40px; font-weight: 800; margin-bottom: 16px; letter-spacing: -1px; }
        .section-subtitle { font-size: 18px; color: var(--text-secondary); }

        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        @media (max-width: 992px) { .features-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 600px) { .features-grid { grid-template-columns: 1fr; } }
        .feature-card { padding: 32px; border-radius: 20px; }
        .feat-icon { width: 48px; height: 48px; background: var(--accent-light); color: var(--accent); border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 24px; }
        .feat-title { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
        .feat-desc { color: var(--text-secondary); line-height: 1.6; }

        /* Steps */
        .steps-container { display: flex; gap: 40px; }
        @media (max-width: 768px) { .steps-container { flex-direction: column; } }
        .step-item { flex: 1; text-align: center; position: relative; }
        .step-number { width: 40px; height: 40px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; font-weight: 700; position: relative; z-index: 2; }
        .step-title { font-size: 22px; font-weight: 700; margin-bottom: 12px; }
        .step-desc { color: var(--text-secondary); }
        .step-arrow { position: absolute; top: 20px; left: calc(50% + 40px); width: calc(100% - 80px); height: 2px; background: var(--border); }
        @media (max-width: 768px) { .step-arrow { display: none; } }

        /* Stats */
        .stats-section { margin-top: -50px; }
        .stats-glass { padding: 60px 40px; border-radius: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 40px; }
        @media (max-width: 768px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
        .stat-val-large { font-size: 48px; font-weight: 800; color: var(--accent); margin-bottom: 8px; letter-spacing: -2px; }
        .stat-label-large { font-size: 15px; color: var(--text-secondary); font-weight: 600; }

        /* CTA Banner */
        .cta-banner { padding: 80px; border-radius: 40px; display: flex; align-items: center; gap: 60px; background: linear-gradient(135deg, var(--accent), var(--purple)); color: white; border: none; overflow: hidden; position: relative; }
        @media (max-width: 992px) { .cta-banner { flex-direction: column; padding: 60px 32px; text-align: center; } }
        .cta-content { flex: 1; position: relative; z-index: 2; }
        .cta-title { font-size: 48px; font-weight: 800; margin-bottom: 24px; color: white; letter-spacing: -1.5px; }
        .cta-subtitle { font-size: 20px; opacity: 0.9; margin-bottom: 40px; }
        .btn-xl { background: white; color: var(--accent); box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
        .btn-xl:hover { background: #f8fafc; color: var(--accent-hover); transform: translateY(-2px); }
        .cta-visual { flex: 0.8; position: relative; height: 300px; }
        .floating-elements { position: relative; width: 100%; height: 100%; }
        .float-box { position: absolute; border-radius: 12px; }
        .float-box.one { width: 120px; height: 120px; top: 10%; right: 10%; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); animation: float 6s infinite ease-in-out; }
        .float-box.two { width: 80px; height: 80px; bottom: 20%; left: 10%; background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); animation: float 8s infinite ease-in-out reverse; }
        .float-box.three { width: 60px; height: 60px; top: 40%; left: 40%; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); animation: float 10s infinite ease-in-out; }
        @keyframes float { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-20px) rotate(5deg); } }

        /* Footer */
        .landing-footer { background: var(--bg-secondary); border-top: 1px solid var(--border); padding: 80px 0 40px; }
        .footer-grid { display: grid; grid-template-columns: 1.5fr 3fr; gap: 80px; margin-bottom: 60px; }
        @media (max-width: 992px) { .footer-grid { grid-template-columns: 1fr; gap: 48px; } }
        .footer-about-text { color: var(--text-secondary); margin-top: 20px; line-height: 1.6; max-width: 300px; }
        .footer-links { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
        .link-group h4 { font-size: 16px; font-weight: 700; margin-bottom: 24px; color: var(--text-primary); }
        .link-group a { display: block; text-decoration: none; color: var(--text-secondary); margin-bottom: 12px; font-size: 14px; transition: color 0.2s; }
        .link-group a:hover { color: var(--accent); }
        .footer-bottom { padding-top: 40px; border-top: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center; color: var(--text-muted); font-size: 13px; }
        @media (max-width: 600px) { .footer-bottom { flex-direction: column; gap: 20px; text-align: center; } }
        .legal-links { display: flex; gap: 24px; }
        .legal-links a { text-decoration: none; color: var(--text-muted); transition: color 0.2s; }
        .legal-links a:hover { color: var(--text-primary); }

        /* Animations */
        .fade-in { animation: fadeIn 1s ease forwards; opacity: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .hero-title { animation-delay: 0.1s; }
        .hero-subtitle { animation-delay: 0.2s; }
        .hero-ctas { animation-delay: 0.3s; }
        .hero-stats { animation-delay: 0.4s; }
        .hero-preview-container { animation-delay: 0.5s; }

        /* RTL Specifics */
        html[dir="rtl"] .hero-stat-item { border-left: none; border-right: 1px solid var(--border); padding-left: 0; padding-right: 48px; }
        html[dir="rtl"] .hero-stat-item:first-child { border-right: none; }
      `}</style>
    </div>
  );
}
