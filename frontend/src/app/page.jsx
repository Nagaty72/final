'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { api } from '@/services/api';
import dynamic from 'next/dynamic';

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
      <main className="relative z-10 pt-32 pb-16 sm:pt-40 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-[45%_55%] gap-12 lg:gap-10 items-center">
            
            {/* Left Column: Copy */}
            <div className="max-w-2xl animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 text-blue-700 dark:text-blue-300 text-xs font-semibold uppercase tracking-wider mb-8 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                AI-Powered Healthcare Intelligence
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.1]">
                Public Health <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-400 dark:to-cyan-300">
                  Intelligence Platform
                </span>
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-8 leading-relaxed max-w-xl">
                Advanced AI decision-support system for national disease surveillance, predictive modeling, and geospatial outbreak tracking.
              </p>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-3 mb-10">
                {['Real-Time Surveillance', 'AI Predictive Analytics', 'Geospatial Intelligence', 'Data-Driven Decisions'].map((pill, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-lg bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2 shadow-sm backdrop-blur-sm">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    {pill}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-10 pt-8 border-t border-slate-200 dark:border-slate-800">
                {[
                  { l: 'Health Records', v: stats?.totalRecords ? formatNumber(stats.totalRecords) : '15M+' },
                  { l: 'Diseases Tracked', v: stats?.totalDiseases || '14' },
                  { l: 'Governorates', v: stats?.governoratesCovered || '27' },
                  { l: 'Hospitals Linked', v: stats?.totalHospitals ? formatNumber(stats.totalHospitals) : '85+' },
                ].map((m, i) => (
                  <div key={i}>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{loadingStats ? '...' : m.v}</div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{m.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Product Showcase */}
            <div className="relative lg:h-[650px] flex items-center justify-center animate-fade-in-up mt-12 lg:mt-0 w-full" style={{ animationDelay: '0.2s' }}>
              {/* Background Map Image */}
              <div className="absolute inset-0 bg-[url('/bg-intelligence.png')] bg-cover bg-center opacity-20 dark:opacity-10 pointer-events-none rounded-[3rem] mix-blend-luminosity"></div>
              
              {/* Main Dashboard Panel */}
              <div className="relative w-full max-w-2xl lg:max-w-none bg-white dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-700/60 rounded-2xl shadow-2xl shadow-slate-300/30 dark:shadow-blue-900/30 overflow-hidden flex flex-col z-20 transform lg:rotate-[1deg] hover:rotate-0 transition-transform duration-500 lg:scale-105 origin-right">
                {/* Header */}
                <div className="h-10 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/60 flex items-center px-4 gap-2 shrink-0">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
                  </div>
                  <div className="mx-auto bg-white/60 dark:bg-slate-900/50 rounded text-[10px] font-mono text-slate-400 px-3 py-1 border border-slate-200 dark:border-slate-700">epicare.gov.eg / intelligence-dashboard</div>
                </div>
                
                {/* Dashboard Content */}
                <div className="p-6 bg-slate-50/50 dark:bg-[#0B1120]/50 space-y-5 flex-1">
                  {/* Top KPIs */}
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { l: 'Active Cases', v: stats?.activeCases ? formatNumber(stats.activeCases) : '12.4k', c: 'text-amber-500', i: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', bg: 'bg-amber-50 dark:bg-amber-500/10' },
                      { l: 'Hospitals', v: stats?.totalHospitals ? formatNumber(stats.totalHospitals) : '85', c: 'text-blue-500', i: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', bg: 'bg-blue-50 dark:bg-blue-500/10' },
                      { l: 'Governorates', v: stats?.governoratesCovered ? formatNumber(stats.governoratesCovered) : '27', c: 'text-green-500', i: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', bg: 'bg-green-50 dark:bg-green-500/10' },
                      { l: 'Diseases', v: stats?.totalDiseases ? formatNumber(stats.totalDiseases) : '14', c: 'text-purple-500', i: 'M13 10V3L4 14h7v7l9-11h-7z', bg: 'bg-purple-50 dark:bg-purple-500/10' },
                    ].map((k,i) => (
                      <div key={i} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${k.bg} ${k.c}`}>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d={k.i} /></svg>
                          </div>
                        </div>
                        <div>
                          <div className={`text-2xl font-extrabold ${k.c}`}>{loadingStats ? '...' : k.v}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">{k.l}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Middle section: Chart & AI */}
                  <div className="grid grid-cols-3 gap-4 h-44">
                    <div className="col-span-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-4 shadow-sm flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <div>
                          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 dark:text-slate-500">Analytics</div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200">Outbreak Velocity (14 Days)</div>
                        </div>
                        <div className={`text-[10px] ${risk.color} ${risk.bg} px-2.5 py-1 rounded-md font-bold flex items-center gap-1 border ${risk.border || 'border-transparent'}`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                          {risk.label} RISK
                        </div>
                      </div>
                      <div className="flex-1 w-full relative">
                        <svg viewBox="0 0 200 50" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          <path d="M0,50 L0,30 C20,35 40,15 60,25 C80,35 100,5 120,20 C140,35 160,10 180,15 L200,5 L200,50 Z" fill="url(#trendGrad)" />
                          <path d="M0,30 C20,35 40,15 60,25 C80,35 100,5 120,20 C140,35 160,10 180,15 L200,5" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          <circle cx="60" cy="25" r="3" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" />
                          <circle cx="120" cy="20" r="3" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" />
                          <circle cx="180" cy="15" r="3" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.5" />
                        </svg>
                      </div>
                    </div>
                    
                    <div className="col-span-1 bg-white dark:bg-[#111827] border border-indigo-100 dark:border-indigo-500/30 rounded-xl p-4 shadow-sm flex flex-col relative overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-400/50 transition-colors">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Insight Generated
                        </div>
                        <span className="text-[9px] text-slate-400">1m ago</span>
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug mb-1.5">
                        Dominant Outbreak Risk
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                        AI models indicate elevated cluster activity for {stats?.topDiseases?.[0]?.name || 'respiratory illness'} across major governorates based on recent velocity.
                      </div>
                      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div className="text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-100 dark:border-red-500/20">Active Alert</div>
                        <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                          Review Data <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Mini Intelligence Map Preview */}
                  <div className="bg-[#f8fafc] dark:bg-[#0c1322] border border-slate-200 dark:border-slate-800 rounded-xl h-44 shadow-inner relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 opacity-40 dark:opacity-20 bg-[url('data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M1 1h18v18H1V1zm1 1v16h16V2H2z\' fill=\'%239C92AC\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'/%3E%3C/svg%3E')] bg-[size:20px_20px]"></div>
                    
                    {/* Real Egypt SVG Background */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-70 dark:opacity-50">
                      <svg viewBox="0 0 400 400" className="w-full h-full max-w-[400px] p-2 drop-shadow-2xl overflow-visible">
                        <path d="M 40 80 Q 100 80 140 100 Q 180 80 200 70 Q 220 80 240 100 Q 280 80 310 70 L 290 140 L 270 200 L 220 140 Q 250 220 280 280 L 320 360 L 40 360 Z" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="1.5" className="dark:fill-[#1e293b]/80 dark:stroke-[#334155]" strokeLinejoin="round" />
                      </svg>
                    </div>

                    {/* Geography Labels */}
                    <div className="absolute inset-0 pointer-events-none p-2 max-w-[400px] mx-auto hidden sm:block">
                      {[
                        { name: 'Alexandria', lat: 31.2001, lng: 29.9187, offY: -12, offX: -10 },
                        { name: 'Cairo', lat: 30.0444, lng: 31.2357, offY: -15, offX: 15 },
                        { name: 'Giza', lat: 29.9870, lng: 31.2118, offY: 5, offX: -20 },
                        { name: 'Luxor', lat: 25.6872, lng: 32.6396, offY: 0, offX: 15 },
                        { name: 'Aswan', lat: 24.0889, lng: 32.8998, offY: 10, offX: 15 }
                      ].map((reg) => {
                        const {x, y} = projectCoords(reg.lat, reg.lng);
                        const labelX = Number.isFinite(x) ? x : 50;
                        const labelY = Number.isFinite(y) ? y : 50;
                        return (
                          <div key={reg.name} className="absolute text-[8px] font-bold text-slate-500/80 dark:text-slate-400/60 uppercase tracking-widest" style={{ left: `calc(${labelX}% + ${reg.offX}px)`, top: `calc(${labelY}% + ${reg.offY}px)`, transform: 'translate(-50%, -50%)' }}>
                            {reg.name}
                          </div>
                        );
                      })}
                    </div>

                    {/* Plotted Governorates */}
                    <div className="relative w-full h-full max-w-[400px] mx-auto pointer-events-none p-2">
                      {bubbleData.slice(0, 5).map((gov, idx) => {
                        // Diagnostic: log raw shape of first entry so field-name mismatches are visible
                        if (idx === 0) console.log('[BUBBLE_DATA_ENTRY]', JSON.stringify(gov));

                        // Skip entirely if coordinates are missing — avoids NaN in left/top CSS
                        const safeLat = Number.isFinite(Number(gov.lat)) ? Number(gov.lat) : null;
                        const safeLng = Number.isFinite(Number(gov.lng)) ? Number(gov.lng) : null;
                        if (safeLat === null || safeLng === null) {
                          console.error('[BUBBLE] non-finite lat/lng — skipping entry:', JSON.stringify(gov));
                          return null;
                        }

                        const {x, y} = projectCoords(safeLat, safeLng);
                        const markerX = Number.isFinite(x) ? x : 50;
                        const markerY = Number.isFinite(y) ? y : 50;

                        // Guard: API may return case_count, total_cases, or cases — normalise here
                        const rawCases = gov.cases ?? gov.case_count ?? gov.total_cases ?? 0;
                        const govCases = Number.isFinite(Number(rawCases)) ? Number(rawCases) : 0;

                        const allCaseCounts = bubbleData.map(d => {
                          const v = d.cases ?? d.case_count ?? d.total_cases ?? 0;
                          return Number.isFinite(Number(v)) ? Number(v) : 0;
                        });
                        const maxCases = Math.max(...allCaseCounts, 1); // always ≥ 1

                        const ratio = govCases / maxCases;
                        const rawSize = 6 + (ratio * 10); // Between 6px and 16px
                        const size = Number.isFinite(rawSize) ? rawSize : 6; // safeWidth guard

                        const colors = govCases > 10000
                          ? { bg: 'bg-red-500',   pulse: 'bg-red-500/30',   border: 'border-red-400',   shadow: 'shadow-[0_0_12px_rgba(239,68,68,0.9)]'   }
                          : govCases > 5000
                          ? { bg: 'bg-amber-500', pulse: 'bg-amber-500/30', border: 'border-amber-400', shadow: 'shadow-[0_0_12px_rgba(245,158,11,0.9)]'  }
                          : { bg: 'bg-blue-500',  pulse: 'bg-blue-500/30',  border: 'border-blue-400',  shadow: 'shadow-[0_0_12px_rgba(59,130,246,0.9)]'  };

                        const safeSize       = Number.isFinite(size)       ? size       : 6;
                        const safeSizeTriple = Number.isFinite(size * 3)   ? size * 3   : 18;

                        return (
                          <div key={idx} className="absolute group pointer-events-auto" style={{ left: `${markerX}%`, top: `${markerY}%`, transform: 'translate(-50%, -50%)' }}>
                            <div className={`absolute rounded-full ${colors.pulse} blur-sm animate-pulse`} style={{ width: safeSizeTriple, height: safeSizeTriple, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
                            <div className={`absolute rounded-full border ${colors.border} animate-ping`} style={{ width: safeSize, height: safeSize, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', animationDuration: '2.5s' }}></div>
                            <div className={`relative rounded-full ${colors.bg} ${colors.shadow} border border-white dark:border-slate-900 transition-transform group-hover:scale-125`} style={{ width: safeSize, height: safeSize }}></div>
                            
                            {/* Hover Tooltip inside map */}
                            <div className="absolute hidden lg:block opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 border border-slate-700 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-30 pointer-events-none -top-7 left-1/2 -translate-x-1/2 shadow-xl">
                              <span className="font-bold">{gov.city?.replace(' Governorate', '')}</span>
                              <span className="text-slate-300 font-mono ml-1">{formatNumber(govCases)} cases</span>
                            </div>
                          </div>
                        );
                      })}
                      {bubbleData.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500 font-mono">Loading telemetry...</div>
                      )}
                    </div>
                    
                    <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-2 z-10">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                      <div className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Active Hotspots</div>
                    </div>

                    {/* Risk Legend */}
                    <div className="absolute bottom-3 right-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg shadow-sm flex flex-col gap-1.5 z-10">
                      <div className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mb-0.5">Risk Level</div>
                      <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span><span className="text-[8px] text-slate-700 dark:text-slate-300 font-bold">High Risk</span></div>
                      <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.8)]"></span><span className="text-[8px] text-slate-700 dark:text-slate-300 font-bold">Medium Risk</span></div>
                      <div className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]"></span><span className="text-[8px] text-slate-700 dark:text-slate-300 font-bold">Low Risk</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements behind the dashboard */}
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 dark:bg-blue-500/20 rounded-full blur-2xl z-0"></div>
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-cyan-500/10 dark:bg-cyan-500/20 rounded-full blur-2xl z-0"></div>
              
              {/* Floating notification card */}
              <div className="absolute -right-6 top-1/4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl z-30 flex items-center gap-3 animate-pulse-slow hidden sm:flex" style={{ animationDelay: '1s' }}>
                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight">Data Synced</div>
                  <div className="text-[9px] text-slate-500 mt-0.5">Just now</div>
                </div>
              </div>
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
