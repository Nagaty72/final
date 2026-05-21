'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import FilterBar       from '@/components/Dashboard/FilterBar';
import KpiCards        from '@/components/Dashboard/KpiCards';
import TrendsChart     from '@/components/Dashboard/TrendsChart';
import DiseaseTrendChart from '@/components/Dashboard/DiseaseTrendChart';
import SeverityChart   from '@/components/Dashboard/SeverityChart';
import DiseaseBreakdown from '@/components/Dashboard/DiseaseBreakdown';

/**
 * Dashboard Page — production-grade healthcare analytics.
 *
 * Architecture:
 * - Global filter state lives in Zustand (useDashboardFilterStore).
 * - Each widget fetches its own data independently with AbortController
 *   for request deduplication / cancellation on rapid filter changes.
 * - Zero static / mock data. All data sourced from Supabase RPCs via backend.
 * - Heatmap removed. Replaced with interactive BubbleChart.
 * - Recent Records table removed. Replaced with SeverityChart.
 */
export default function DashboardPage() {
  const { t }    = useTranslation();
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto' }}>

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
            {t('dashboard.title', 'Analytics Dashboard')}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>
            {t('dashboard.overview', 'Real-time healthcare insights — powered by live database queries')}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Disease Map CTA */}
          <Link
            href="/intelligence-map"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '9px 18px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(59,130,246,0.35)',
              borderRadius: 10, textDecoration: 'none',
              color: '#3b82f6', fontSize: 13, fontWeight: 700,
              transition: 'all 0.2s ease',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25))';
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.6)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))';
              e.currentTarget.style.borderColor = 'rgba(59,130,246,0.35)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Disease Map
          </Link>
          {/* Live indicator */}
          <div style={{
            fontSize: 12, color: 'var(--text-muted)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
            Live · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        </div>
      </div>

      {/* ── Global Filter Bar ─────────────────────────────────────────────── */}
      <FilterBar />

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 24 }}>
        <KpiCards />
      </section>

      {/* ── Row 1: Trends (2/3) + Disease Breakdown (1/3) ────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: 20,
        marginBottom: 20,
        alignItems: 'stretch',
      }}>
        <TrendsChart />
        <DiseaseBreakdown />
      </div>

      {/* ── Row 2: Disease Trend Line Chart (3fr) + Severity Donut (2fr) ────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3fr 2fr',
        gap: 20,
        marginBottom: 20,
        alignItems: 'stretch',
      }}>
        <DiseaseTrendChart />
        <SeverityChart />
      </div>

      {/* ── Global animation keyframe (shared by skeletons) ──────────────── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @media (max-width: 1024px) {
          .dash-row-1, .dash-row-2 {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
