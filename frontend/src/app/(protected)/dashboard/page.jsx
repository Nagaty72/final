'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import FilterBar        from '@/components/Dashboard/FilterBar';
import KpiCards         from '@/components/Dashboard/KpiCards';
import ExecutiveSummary from '@/components/Dashboard/ExecutiveSummary';
import TrendsChart      from '@/components/Dashboard/TrendsChart';
import DiseaseTrendChart from '@/components/Dashboard/DiseaseTrendChart';
import SeverityChart    from '@/components/Dashboard/SeverityChart';
import DiseaseBreakdown from '@/components/Dashboard/DiseaseBreakdown';

/**
 * Dashboard Page — production-grade healthcare analytics.
 *
 * Hierarchy:
 *  Level 1 — Hero KPI (Total Cases)
 *  Level 2 — Secondary KPI Cards
 *  Level 3 — Charts
 *  Level 4 — Filters (demoted to utility, not primary attention)
 */
export default function DashboardPage() {
  const { t }    = useTranslation();
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 28,
      }}>
        <div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, margin: '0 0 4px',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)',
            letterSpacing: '-0.03em',
          }}>
            {t('dashboard.title', 'Analytics Dashboard')}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            {t('dashboard.overview', 'Real-time healthcare insights — powered by live database queries')}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Disease Map CTA */}
          <Link
            href="/intelligence-map"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '8px 16px',
              background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(139,92,246,0.12))',
              border: '1px solid rgba(37,99,235,0.3)',
              borderRadius: 'var(--radius-sm)', textDecoration: 'none',
              color: 'var(--accent)', fontSize: 13, fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.2), rgba(139,92,246,0.2))';
              e.currentTarget.style.borderColor = 'rgba(37,99,235,0.5)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(37,99,235,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(139,92,246,0.12))';
              e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Disease Map
          </Link>

          {/* Live indicator */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 12, color: 'var(--text-muted)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: '6px 12px',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--success)', display: 'inline-block',
              boxShadow: '0 0 6px var(--success)',
              animation: 'live-pulse 2s ease-in-out infinite',
            }} />
            Live · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Level 1+2: Hero + Secondary KPIs ────────────────────────────── */}
      <section style={{ marginBottom: 24 }}>
        <KpiCards />
      </section>

      {/* ── Executive Briefing Card ──────────────────────────────────────── */}
      <section style={{ marginBottom: 24 }}>
        <ExecutiveSummary />
      </section>

      {/* ── Level 4: Global Filter Bar (utility, below KPIs) ────────────── */}
      <section style={{ marginBottom: 32 }}>
        <FilterBar />
      </section>

      {/* ── Level 3a: Row 1 — Trends (2/3) + Disease Breakdown (1/3) ────── */}
      <section style={{ marginBottom: 24 }}>
        <div className="dash-row-1" style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: 20,
          alignItems: 'stretch',
        }}>
          <TrendsChart />
          <DiseaseBreakdown />
        </div>
      </section>

      {/* ── Level 3b: Row 2 — Disease Trend (3fr) + Severity (2fr) ─────── */}
      <section style={{ marginBottom: 24 }}>
        <div className="dash-row-2" style={{
          display: 'grid',
          gridTemplateColumns: '3fr 2fr',
          gap: 20,
          alignItems: 'stretch',
        }}>
          <DiseaseTrendChart />
          <SeverityChart />
        </div>
      </section>

      <style>{`
        @keyframes live-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px var(--success); }
          50%       { opacity: 0.6; box-shadow: 0 0 10px var(--success); }
        }
        @keyframes kpi-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @media (max-width: 1024px) {
          .dash-row-1, .dash-row-2 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
