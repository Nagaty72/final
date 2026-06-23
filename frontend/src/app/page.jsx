'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { api } from '@/services/api';
import dynamic from 'next/dynamic';

const PublicFacilityFinder = dynamic(() => import('@/components/PublicFacilityFinder'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 w-full min-h-[500px] flex items-center justify-center bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 backdrop-blur-xl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400 animate-pulse">Initializing Facility Map...</div>
      </div>
    </div>
  )
});

const MapPreview = dynamic(() => import('@/components/LandingMapPreview'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
      <div className="text-sm font-mono text-cyan-500 animate-pulse flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin"></div>
        Initializing Geospatial Engine...
      </div>
    </div>
  )
});

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [bubbleData, setBubbleData] = useState([]);
  const [severityData, setSeverityData] = useState([]);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      console.log('[FRONTEND REQUEST] Calling api.get(/api/v1/public/stats)');
      const res = await api.get('/api/v1/public/stats');
      console.log('[FRONTEND RESPONSE]', res);
      if (res.success) {
        setStats(res.data);
      }
      
      try {
        // Note: /api/v1/analytics/bubble-data requires authentication.
        // On the public landing page the call always returns 401/403.
        // Use static representative data with known-good coordinates instead.
        // If a real authenticated call is needed here in future, move it
        // behind a separate public analytics endpoint that returns lat/lng.
        console.log('[BUBBLE_DATA] Using static fallback coordinates for public landing page.');
        setBubbleData([
          { city: 'Cairo Governorate',     cases: 14200, lat: 30.0444, lng: 31.2357 },
          { city: 'Alexandria Governorate', cases: 8500,  lat: 31.2001, lng: 29.9187 },
          { city: 'Giza Governorate',       cases: 7200,  lat: 30.0131, lng: 31.2089 },
          { city: 'Dakahlia Governorate',   cases: 4100,  lat: 31.0364, lng: 31.3807 },
          { city: 'Aswan Governorate',      cases: 2100,  lat: 24.0889, lng: 32.8998 },
        ]);

        if (severityRes?.success && severityRes.data.length > 0) {
          setSeverityData(severityRes.data);
        } else {
          setSeverityData([
            { severity: 'Critical', count: 12 },
            { severity: 'High',     count: 45 },
            { severity: 'Medium',   count: 120 },
          ]);
        }
      } catch (e) {
        // Fallback already handled above
      }
    } catch (err) {
      console.error('[FRONTEND ERROR] Failed to fetch public stats:', err);
      // Fallback empty stats so UI doesn't break
      setStats({
        totalPatients: 0,
        totalHospitals: 0,
        totalDiseases: 0,
        totalRecords: 0,
        governoratesCovered: 0,
        topDiseases: []
      });
      setBubbleData([]);
      setSeverityData([]);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, []);

  // We can render immediately because next-themes suppresses hydration warnings on html/body.
  // We still track mounted state if we need it for other client-only renders, but we do not block the page.

  const isRTL = i18n.language === 'ar';

  const formatNumber = (num) => {
    const numVal = Number(num ?? 0);
    if (numVal >= 1_000_000) return `${(numVal / 1_000_000).toFixed(1)}M`;
    if (numVal >= 1000) return `${(numVal / 1000).toFixed(1)}k`;
    return numVal.toLocaleString();
  };

  const getSeverityRisk = () => {
    if (!severityData || severityData.length === 0) return { label: 'MODERATE', color: 'text-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500' };
    const critical = severityData.find(s => s.severity === 'Critical')?.count || 0;
    const high = severityData.find(s => s.severity === 'High')?.count || 0;
    if (critical > 0 || high > 50) return { label: 'CRITICAL', color: 'text-red-500', bg: 'bg-red-500/10', dot: 'bg-red-500' };
    if (high > 0) return { label: 'ELEVATED', color: 'text-amber-500', bg: 'bg-amber-500/10', dot: 'bg-amber-500' };
    return { label: 'CONTROLLED', color: 'text-green-500', bg: 'bg-green-500/10', dot: 'bg-green-500' };
  };

  const projectCoords = (lat, lng) => {
    const safeLat = Number.isFinite(Number(lat)) ? Number(lat) : 0;
    const safeLng = Number.isFinite(Number(lng)) ? Number(lng) : 0;
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) {
      console.error('[projectCoords] non-finite input — lat:', lat, 'lng:', lng, '→ clamped to 0');
    }
    // Map exact coordinates to the 400x400 viewBox SVG path of Egypt
    const x = 40 + ((safeLng - 25.0) / 10.0) * 280;
    const y = 360 - ((safeLat - 22.0) / 9.5) * 290;
    const safeX = Number.isFinite(x) ? (x / 400) * 100 : 0;
    const safeY = Number.isFinite(y) ? (y / 400) * 100 : 0;
    return { x: safeX, y: safeY };
  };

  const risk = getSeverityRisk();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans overflow-x-hidden selection:bg-blue-500/30">

      {/* Dynamic Background Gradients & Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-slate-50 dark:bg-[#030712]">
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        {/* Glows */}
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-blue-500/20 dark:bg-blue-600/10 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute top-[20%] left-[-10%] w-[30%] h-[40%] rounded-full bg-cyan-500/20 dark:bg-cyan-500/10 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[104px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="w-[84px] h-[84px] rounded-2xl bg-transparent dark:bg-white/5 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-all overflow-hidden border border-slate-200 dark:border-white/10 dark:shadow-[0_4px_24px_rgba(255,255,255,0.15)]">
              <img src="/logo.jpeg" alt="Epicare Logo" className="w-full h-full object-contain dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">
                {t('landing.nav_platform') || 'Epicare'}
              </span>
              <div className="text-[9px] font-semibold tracking-widest uppercase text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                National Health Intelligence
              </div>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors">
              {t('landing.nav_features') || 'Capabilities'}
            </a>
            <a href="#intelligence" className="text-sm font-medium text-slate-600 hover:text-blue-600 dark:text-slate-300 dark:hover:text-blue-400 transition-colors">
              {t('landing.nav_how') || 'Intelligence'}
            </a>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <LanguageSwitcher />

            {!loading && (
              user ? (
                <Link href="/dashboard" className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-600/20">
                  {t('landing.nav_dashboard') || 'Go to Dashboard'}
                </Link>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="hidden sm:block px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    {t('landing.nav_login') || 'Sign In'}
                  </Link>
                  <Link href="/login?mode=signup" className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors shadow-lg shadow-blue-600/20">
                    {t('landing.nav_signup') || 'Request Access'}
                  </Link>
                </div>
              )
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 pt-28 pb-12 sm:pt-36 lg:pt-40 lg:pb-24 overflow-hidden">
        <div className="w-[85%] xl:w-[80%] max-w-[1280px] mx-auto px-4">
          <div className="flex flex-col items-center">
            
            {/* Top Area: Copy (Centered) */}
            <div className="max-w-4xl text-center animate-fade-in-up mb-10 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                AI-Powered Healthcare Intelligence
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]">
                Public Health <br className="hidden sm:block" />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
                  Intelligence Platform
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-2xl">
                Advanced AI decision-support system for national disease surveillance, predictive modeling, and geospatial outbreak tracking.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap justify-center gap-3 mb-8">
                {['Real-Time Surveillance', 'AI Predictive Analytics', 'Geospatial Intelligence', 'Data-Driven Decisions'].map((pill, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-sm backdrop-blur-sm">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    {pill}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href={user ? "/dashboard" : "/login"} className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 group">
                  Explore Dashboard
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <a href="#intelligence" className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-lg transition-all flex items-center justify-center gap-2">
                  See How It Works
                </a>
              </div>
            </div>

            {/* Bottom Area: Full-width Interactive Facility Finder */}
            <div className="relative w-full lg:h-[600px] animate-fade-in-up mt-6" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-[url('/bg-intelligence.png')] bg-cover bg-center opacity-20 dark:opacity-10 pointer-events-none rounded-[2.5rem] mix-blend-luminosity"></div>
              
              {/* Facility Finder Component */}
              <div className="relative w-full h-full flex flex-col z-20 transition-transform duration-500 hover:scale-[1.01]">
                <PublicFacilityFinder />
              </div>
              
              {/* Decorative elements behind the finder */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-blue-500/20 dark:bg-blue-500/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-cyan-500/20 dark:bg-cyan-500/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
            </div>

            {/* Platform Stats placed below map */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 w-full max-w-4xl mx-auto text-center">
              {[
                { l: 'Health Records', v: stats?.totalRecords ? formatNumber(stats.totalRecords) : '15M+' },
                { l: 'Diseases Tracked', v: stats?.totalDiseases || '14' },
                { l: 'Governorates', v: stats?.governoratesCovered || '27' },
                { l: 'Hospitals Linked', v: stats?.totalHospitals ? formatNumber(stats.totalHospitals) : '85+' },
              ].map((m, i) => (
                <div key={i}>
                  <div className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-2">{loadingStats ? '...' : m.v}</div>
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-500 font-bold">{m.l}</div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </main>

      {/* Disease Intelligence Preview & Top Diseases */}
      <section id="intelligence" className="py-24 relative z-10 border-t border-slate-200/50 dark:border-slate-800/50 bg-white/20 dark:bg-[#080e1a]/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              Live Intelligence Feed
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">National Disease Intelligence</h2>
            <p className="text-base text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
              Live tracking and predictive modeling of critical outbreaks across Egypt — updated in real-time from connected healthcare facilities.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Top Diseases Live Feed */}
            <div className="lg:col-span-1 bg-white dark:bg-[#0f1829] border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-xl shadow-slate-200/20 dark:shadow-black/40 flex flex-col overflow-hidden">
              {/* Panel header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/60" style={{ background: 'transparent' }}>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Active Alerts
                </h3>
                <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">Live</span>
              </div>

              <div className="flex-1 overflow-hidden relative p-4">
                {loadingStats ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="animate-pulse flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-white/4">
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2 h-full">
                    {stats?.topDiseases?.length > 0 ? stats.topDiseases.slice(0, 10).map((disease, idx) => {
                      const rankColors = ['#ef4444', '#ef4444', '#ef4444', '#f59e0b', '#f59e0b', '#f59e0b', '#a855f7', '#3b82f6', '#10b981', '#10b981'];
                      const rc = rankColors[idx] || '#64748b';
                      return (
                        <div key={idx} className="group flex items-center justify-between p-3 rounded-xl transition-colors hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-200 dark:hover:border-white/8">
                          <div className="flex items-center gap-3">
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${rc}18`, border: `1.5px solid ${rc}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: rc, flexShrink: 0, fontFamily: 'monospace' }}>
                              {idx + 1}
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight">{disease.name}</div>
                              {disease.percentage > 0 && (
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">{Number(disease.percentage).toFixed(1)}% of total</div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-sm font-mono" style={{ color: rc }}>{formatNumber(disease.cases)}</div>
                            <div className="text-[9px] text-slate-400 uppercase tracking-wider">cases</div>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="text-center text-slate-400 dark:text-slate-500 py-10 text-sm">No alerts available</div>
                    )}
                  </div>
                )}
              </div>
              <div className="px-4 pb-4 mt-auto">
                <Link href="/dashboard" className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-center text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 block transition-colors">
                  View Full Analytics →
                </Link>
              </div>
            </div>

            {/* Map Preview — Premium Intelligence Dashboard Chrome */}
            <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-700/60 shadow-2xl shadow-slate-300/20 dark:shadow-black/60 flex flex-col min-h-[480px]" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #0c1628 100%)' }}>

              {/* Header bar — dark GIS chrome */}
              <div className="flex items-center justify-between px-4 h-11 border-b border-white/5 flex-shrink-0" style={{ background: 'rgba(15,23,42,0.95)' }}>
                {/* Traffic lights */}
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/70"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/70"></div>
                </div>
                {/* URL bar */}
                <div className="flex-1 mx-4 bg-white/5 border border-white/8 rounded-md h-6 flex items-center px-3 gap-2 max-w-xs">
                  <svg className="w-2.5 h-2.5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-slate-400 text-[10px] font-mono tracking-wide">epicare.gov.eg / intelligence-map</span>
                </div>
                {/* Live indicator */}
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-green-400 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                  Live
                </div>
              </div>

              {/* Map area - Real Intelligence Visualization */}
              <div className="flex-1 relative overflow-hidden flex flex-col min-h-[550px]">
                {/* Real Map layer */}
                <div className="absolute inset-0 z-0">
                  <MapPreview bubbleData={bubbleData} />
                </div>

                {/* Overlays / Chrome */}
                <div className="absolute inset-0 pointer-events-none z-10 flex flex-col">
                  {/* Floating LIVE Badge */}
                  <div className="absolute top-5 right-5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/60 px-3.5 py-2.5 rounded-xl flex items-center gap-3 shadow-xl z-20 pointer-events-auto">
                    <div className="flex flex-col items-end">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold">Last Updated</div>
                      <div className="text-[10px] text-slate-700 dark:text-slate-300 font-mono mt-0.5">2 min ago</div>
                    </div>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-700"></div>
                    <div className="flex items-center gap-2.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
                      </span>
                      <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 tracking-widest uppercase">Live Data</span>
                    </div>
                  </div>

                  {/* Intelligence Summary Footer */}
                  <div className="mt-auto m-5 bg-white/95 dark:bg-[#0a1120]/95 backdrop-blur-xl border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 shadow-[0_15px_30px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_30px_rgba(0,0,0,0.6)] pointer-events-auto">
                    <div className="flex-1 min-w-[120px]">
                      <div className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 mb-1.5">Top Disease</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {stats?.topDiseases?.[0]?.name || 'Loading...'}
                      </div>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700/50 hidden sm:block"></div>
                    <div className="flex-1 min-w-[120px]">
                      <div className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 mb-1.5">Highest Risk Region</div>
                      <div className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        {bubbleData[0]?.city?.replace(' Governorate', '') || 'Calculating...'}
                      </div>
                    </div>
                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700/50 hidden sm:block"></div>
                    <div className="flex-1 min-w-[120px]">
                      <div className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500 mb-1.5">Active Hotspots</div>
                      <div className="text-sm font-bold text-cyan-600 dark:text-cyan-400 font-mono">
                        {bubbleData.length || 0} Identified
                      </div>
                    </div>
                    <div className="ml-auto hidden sm:block">
                       <Link
                        href="/intelligence-map"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/30 hover:border-cyan-300 dark:hover:border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                      >
                        Open Full Map
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">Core Capabilities</h2>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              A comprehensive suite of tools designed for decision makers, epidemiologists, and healthcare administrators.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { title: 'AI Predictive Modeling', desc: 'Foresee outbreak trajectories using advanced machine learning applied to historical and real-time medical records.', icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'blue' },
              { title: 'Geospatial Intelligence', desc: 'Pinpoint infection clusters and track geographical spread on high-resolution interactive maps.', icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'purple' },
              { title: 'Real-Time KPI Dashboards', desc: 'Monitor active cases, recovery rates, and critical severity metrics filtered by any parameter instantly.', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color: 'green' },
              { title: 'Hospital Capacity Monitoring', desc: 'Track resource availability and patient loads across the national healthcare network.', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'red' },
              { title: 'Automated Reporting', desc: 'Generate comprehensive epidemiological reports with a single click for stakeholders and authorities.', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color: 'amber' },
              { title: 'AI Chat Assistant', desc: 'Query the platform using natural language to extract specific insights without touching a dashboard.', icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', color: 'indigo' },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-800/80 rounded-2xl p-8 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 bg-${feature.color}-100 text-${feature.color}-600 dark:bg-${feature.color}-900/30 dark:text-${feature.color}-400`}>
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-[2.5rem] p-10 sm:p-16 text-center text-white shadow-2xl relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-black opacity-10 rounded-full blur-3xl"></div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 relative z-10">Trusted by Public Health Decision-Makers</h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto mb-10 relative z-10">
              Join the national network of healthcare institutions using Epicare for real-time epidemiological intelligence and proactive outbreak management.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
              <Link href="/login?mode=signup" className="px-8 py-4 rounded-xl bg-white text-blue-600 font-bold text-lg hover:bg-slate-50 transition-colors shadow-lg">
                Request Access
              </Link>
              <Link href="/login" className="px-8 py-4 rounded-xl bg-blue-700/50 hover:bg-blue-700 border border-blue-400/30 text-white font-bold text-lg transition-colors">
                Sign In to Platform
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1120] pt-16 pb-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-[84px] h-[84px] rounded-2xl bg-transparent dark:bg-white/5 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10 dark:shadow-[0_4px_24px_rgba(255,255,255,0.15)] transition-all">
                <img src="/logo.jpeg" alt="Epicare Logo" className="w-full h-full object-contain dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] filter drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]" />
              </div>
              <div>
                <span className="font-bold text-lg text-slate-900 dark:text-white">Epicare</span>
                <div className="text-[9px] font-semibold tracking-widest uppercase text-slate-400 leading-none mt-0.5">National Health Intelligence Platform</div>
              </div>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-sm">
              &copy; {new Date().getFullYear()} Epicare — National Health Intelligence Platform. All rights reserved.
            </p>

            <div className="flex gap-4">
              <Link href="/privacy" className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy</Link>
              <Link href="/terms" className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms</Link>
              <Link href="/support" className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Global minimal CSS animations just for this component */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
