'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { api } from '@/services/api';
import dynamic from 'next/dynamic';

const PreviewMap = dynamic(() => import('@/components/PreviewMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 dark:bg-slate-800 animate-pulse"></div>
});
export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const { user, loading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setMounted(true);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await api.get('/api/v1/public/stats');
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch public stats:', err);
      // Fallback empty stats so UI doesn't break
      setStats({
        totalPatients: 0,
        totalHospitals: 0,
        totalDiseases: 0,
        totalRecords: 0,
        governoratesCovered: 0,
        topDiseases: []
      });
    } finally {
      setLoadingStats(false);
    }
  };

  // We can render immediately because next-themes suppresses hydration warnings on html/body.
  // We still track mounted state if we need it for other client-only renders, but we do not block the page.

  const isRTL = i18n.language === 'ar';

  const formatNumber = (num) => {
    const numVal = Number(num ?? 0);
    if (numVal >= 1_000_000) return `${(numVal / 1_000_000).toFixed(1)}M`;
    if (numVal >= 1000) return `${(numVal / 1000).toFixed(1)}k`;
    return numVal.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans overflow-x-hidden selection:bg-blue-500/30">

      {/* Dynamic Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 dark:bg-blue-600/20 blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 dark:bg-purple-600/20 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
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
      <main className="relative z-10 pt-32 pb-16 sm:pt-40 sm:pb-24 lg:pb-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-950/60 dark:bg-blue-950/80 border border-blue-700/40 text-blue-300 text-xs font-bold uppercase tracking-widest mb-10 animate-fade-in-up shadow-lg shadow-blue-900/20 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400"></span>
            </span>
            National Health Intelligence System · Egypt
          </div>

          <h1 className="max-w-4xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            <span className="block text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none text-slate-900 dark:text-white mb-3">
              National Health
            </span>
            <span className="block text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 dark:from-blue-400 dark:via-cyan-300 dark:to-teal-300 mb-6">
              Intelligence Platform
            </span>
            <span className="block text-lg sm:text-xl lg:text-2xl font-semibold tracking-wide text-slate-500 dark:text-slate-400 uppercase">
              Real-Time Public Health Surveillance Platform
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-500 dark:text-slate-400 mb-10 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Monitor outbreaks, analyze epidemiological trends, and track public health risks across Egypt in real time&nbsp;&mdash; powered by advanced analytics, AI models, and integrated healthcare data.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link href={user ? "/dashboard" : "/login"} className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg transition-all shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 group">
              Explore Dashboard
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
            <Link href={user ? "/intelligence-map" : "/login"} className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-lg transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Open Disease Map
            </Link>
          </div>

          {/* Real-Time Live Stats Grid */}
          <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            {[
              { label: 'Active Cases', value: stats?.activeCases, icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z', color: 'text-amber-500' },
              { label: 'Total Patients', value: stats?.totalPatients, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', color: 'text-purple-500' },
              { label: 'Total Hospitals', value: stats?.totalHospitals, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', color: 'text-cyan-500' },
              { label: 'Total Diseases', value: stats?.totalDiseases, icon: 'M13 10V3L4 14h7v7l9-11h-7z', color: 'text-blue-500' },
              { label: 'Governorates', value: stats?.governoratesCovered, icon: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'text-green-500' },
            ].map((stat, idx) => (
              <div key={idx} className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 p-6 rounded-2xl flex flex-col items-center text-center transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/10 hover:border-blue-500/30">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-900/40 flex items-center justify-center mb-4">
                  <svg className={`w-6 h-6 ${stat.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d={stat.icon} />
                  </svg>
                </div>
                {loadingStats ? (
                  <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-1"></div>
                ) : (
                  <div className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white mb-1">
                    {formatNumber(stat.value)}
                  </div>
                )}
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {stat.label}
                </div>
              </div>
            ))}
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
                  <div className="space-y-2">
                    {stats?.topDiseases?.length > 0 ? stats.topDiseases.map((disease, idx) => {
                      const rankColors = ['#ef4444', '#f59e0b', '#a855f7', '#3b82f6', '#10b981'];
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

              {/* Map area */}
              <div className="flex-1 relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                  <PreviewMap diseases={stats?.topDiseases} />
                </div>
                {/* Bottom gradient fade */}
                <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none z-10" style={{ background: 'linear-gradient(to top, rgba(15,23,42,0.7) 0%, transparent 100%)' }} />
                {/* CTA button */}
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20">
                  <Link
                    href="/intelligence-map"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all"
                    style={{ background: 'rgba(59,130,246,0.15)', backdropFilter: 'blur(16px)', border: '1px solid rgba(59,130,246,0.35)', color: '#93c5fd', boxShadow: '0 0 20px rgba(59,130,246,0.15)' }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open Full Interactive Map
                  </Link>
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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
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
