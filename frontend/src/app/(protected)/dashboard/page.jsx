'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import FilterBar       from '@/components/Dashboard/FilterBar';
import KpiCards        from '@/components/Dashboard/KpiCards';
import TrendsChart     from '@/components/Dashboard/TrendsChart';
import BubbleChart     from '@/components/Dashboard/BubbleChart';
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
        <div style={{
          fontSize: 12, color: 'var(--text-muted)',
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px #22c55e' }} />
          Live · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
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

      {/* ── Row 2: Bubble Chart (3/5) + Severity Donut (2/5) ─────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3fr 2fr',
        gap: 20,
        marginBottom: 20,
        alignItems: 'stretch',
      }}>
        <BubbleChart />
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
