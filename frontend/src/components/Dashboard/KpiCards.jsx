'use client';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow } from 'zustand/react/shallow';
import { getDashboardKpis, getDashboardTrends } from '@/services/analytics.service';
import { Activity, Users, Hospital, TrendingUp, AlertTriangle, HeartPulse, TrendingDown, Minus } from 'lucide-react';
import { KPI_PALETTE } from '@/lib/chartTheme';

/* ─── KPI config — Total Cases is the Hero, rest are secondary ───────────── */
const SECONDARY_CONFIG = [
  { key: 'active_cases',    label: 'Active Cases',      icon: HeartPulse,    variant: 'warning',  ...KPI_PALETTE.active_cases    },
  { key: 'recovered_cases', label: 'Recovered',         icon: TrendingUp,    variant: 'success',  ...KPI_PALETTE.recovered       },
  { key: 'critical_cases',  label: 'Severe / Critical', icon: AlertTriangle, variant: 'danger',   ...KPI_PALETTE.severe_cases    },
  { key: 'total_patients',  label: 'Total Patients',    icon: Users,         variant: 'purple',   ...KPI_PALETTE.total_patients  },
  { key: 'total_hospitals', label: 'Hospitals',         icon: Hospital,      variant: 'info',     ...KPI_PALETTE.total_hospitals },
];

/* ─── Variant border-top gradient map ────────────────────────────────────── */
const VARIANT_TOP = {
  warning: 'linear-gradient(90deg, #d97706, #f59e0b)',
  success: 'linear-gradient(90deg, #059669, #10b981)',
  danger:  'linear-gradient(90deg, #dc2626, #ef4444)',
  purple:  'linear-gradient(90deg, #7c3aed, #a78bfa)',
  info:    'linear-gradient(90deg, #2563eb, #06b6d4)',
};

/* ─── Number formatting ───────────────────────────────────────────────────── */
function fmt(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

/* ─── Normalize trends response → sorted counts ──────────────────────────── */
const MONTH_ORDER = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };

function normalizeTrends(responseData) {
  let rows = [];
  if (Array.isArray(responseData)) rows = responseData;
  else if (responseData?.data && Array.isArray(responseData.data)) rows = responseData.data;

  return rows
    .map(r => ({
      month: r.month ?? '',
      year:  Number(r.year ?? 0),
      count: Number(r.count ?? r.total_cases ?? 0),
    }))
    .filter(r => r.month)
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return (MONTH_ORDER[a.month] ?? 0) - (MONTH_ORDER[b.month] ?? 0);
    });
}

/* ─── Real Sparkline driven by actual trend data ─────────────────────────── */
function RealSparkline({ trendRows, color }) {
  // Take the last 12 periods from sorted trend data
  const slice = trendRows.slice(-12);
  if (slice.length === 0) return null;

  const max = Math.max(...slice.map(r => r.count), 1);
  const min = Math.min(...slice.map(r => r.count), 0);
  const range = max - min || 1;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36, width: 88, flexShrink: 0 }}>
      {slice.map((r, i) => {
        const pct = Math.max(((r.count - min) / range) * 100, 6);
        const isLast = i === slice.length - 1;
        return (
          <div
            key={i}
            title={`${r.month} ${r.year}: ${r.count.toLocaleString()} cases`}
            style={{
              flex: 1, borderRadius: '2px 2px 0 0',
              height: `${pct}%`,
              background: isLast
                ? color
                : `${color}${Math.round(40 + (i / slice.length) * 140).toString(16).padStart(2, '0')}`,
              transition: 'height 0.3s ease',
              cursor: 'default',
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── Compute period-over-period % change from real KPI data ───────────── */
function computeTrend(currVal, prevVal) {
  const curr = Number(currVal || 0);
  const prev = Number(prevVal || 0);
  
  console.log("--- TREND CALCULATION ---");
  console.log("Current Period Cases:", curr);
  console.log("Previous Period Cases:", prev);

  if (prev === 0 || isNaN(prev)) {
    console.log("Growth %: N/A (prev is 0)");
    return null;
  }
  
  const pct = Math.round(((curr - prev) / prev) * 100);
  console.log("Growth %:", pct + "%");
  return pct;
}

/* ─── Trend indicator ────────────────────────────────────────────────────── */
function TrendBadge({ pct }) {
  if (pct === null || pct === undefined) return null;
  const up   = pct > 0;
  const flat = pct === 0;
  const Icon  = flat ? Minus : up ? TrendingUp : TrendingDown;
  const color = flat ? 'var(--text-muted)' : up ? 'var(--danger)' : 'var(--success)';
  const bg    = flat ? 'rgba(100,116,139,0.1)' : up ? 'var(--danger-light)' : 'var(--success-light)';
  const label = flat ? 'Stable' : `${up ? '+' : ''}${pct}% vs prev period`;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      padding: '3px 9px', borderRadius: 100,
      background: bg, color,
      fontSize: 11, fontWeight: 700,
    }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

/* ─── Hero KPI Card ──────────────────────────────────────────────────────── */
function HeroKpiCard({ value, prevValue, trendRows, lastUpdated }) {
  const numVal  = Number(value ?? 0);
  const display = fmt(numVal);
  const trendPct = useMemo(() => computeTrend(value, prevValue), [value, prevValue]);
  const periodLabel = trendRows.length > 0
    ? `${trendRows[trendRows.length - 1]?.month} ${trendRows[trendRows.length - 1]?.year}`
    : null;

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '28px 32px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
      transition: 'box-shadow 0.25s ease',
      gridColumn: 'span 2',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    >
      {/* Top gradient accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, #2563eb, #06b6d4, #8b5cf6)',
      }} />

      {/* Ambient glow orb */}
      <div style={{
        position: 'absolute', top: -60, right: -40,
        width: 200, height: 200,
        background: 'radial-gradient(circle, rgba(37,99,235,0.07), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, position: 'relative' }}>
        {/* Left: main data */}
        <div>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'rgba(37,99,235,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(37,99,235,0.2)',
            }}>
              <Activity size={18} style={{ color: '#2563eb' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total Cases
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '2px 8px', borderRadius: 100,
                  background: 'rgba(16,185,129,0.12)', color: 'var(--success)',
                  fontSize: 10, fontWeight: 700,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Big number */}
          <div style={{
            fontSize: 52, fontWeight: 800, color: 'var(--text-primary)',
            letterSpacing: '-0.04em', lineHeight: 1,
            fontFamily: 'var(--font-display)',
            marginBottom: 14,
          }}>
            {display}
          </div>

          {/* Trend + timestamp row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <TrendBadge pct={trendPct} />
            {periodLabel && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Latest: {periodLabel}
              </span>
            )}
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              · Updated {lastUpdated}
            </span>
          </div>
        </div>

        {/* Right: real sparkline */}
        {trendRows.length > 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0, paddingTop: 4 }}>
            <RealSparkline trendRows={trendRows} color="#2563eb" />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
              {trendRows.length}-period trend
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Secondary KPI Card ─────────────────────────────────────────────────── */
function SecondaryKpiCard({ config, value }) {
  const Icon     = config.icon;
  const numVal   = Number(value ?? 0);
  const display  = fmt(numVal);
  const topGrad  = VARIANT_TOP[config.variant] || VARIANT_TOP.info;

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: `1px solid var(--border)`,
      borderRadius: 'var(--radius-lg)',
      padding: '18px 20px',
      display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative', overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = config.border;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--border)';
      }}
    >
      {/* top accent line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: topGrad, borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }} />

      {/* Icon + variant dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: config.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 1px ${config.border}`,
        }}>
          <Icon size={18} style={{ color: config.color }} />
        </div>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: config.color, boxShadow: `0 0 6px ${config.color}` }} />
      </div>

      {/* Number + label */}
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          {config.label}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', fontFamily: 'var(--font-display)' }}>
          {display}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: 'var(--bg-card-hover)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          width: `${Math.min((numVal / 1000) * 10, 100)}%`,
          height: '100%',
          background: topGrad,
          borderRadius: 2,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function KpiSkeleton() {
  const pulse = { animation: 'kpi-pulse 1.5s ease-in-out infinite' };
  return (
    <>
      <style>{`@keyframes kpi-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }`}</style>
      <div style={{
        gridColumn: 'span 2',
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', padding: '28px 32px',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ width: 100, height: 12, borderRadius: 4, background: 'var(--bg-card-hover)', marginBottom: 20, ...pulse }} />
            <div style={{ width: 160, height: 52, borderRadius: 8, background: 'var(--bg-card-hover)', marginBottom: 16, ...pulse }} />
            <div style={{ width: 180, height: 20, borderRadius: 12, background: 'var(--bg-card-hover)', ...pulse }} />
          </div>
          <div style={{ width: 88, height: 36, borderRadius: 4, background: 'var(--bg-card-hover)', ...pulse, alignSelf: 'flex-end' }} />
        </div>
      </div>
      {SECONDARY_CONFIG.map(k => (
        <div key={k.key} style={{
          background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '18px 20px',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-card-hover)', marginBottom: 14, ...pulse }} />
          <div style={{ width: '60%', height: 10, borderRadius: 4, background: 'var(--bg-card-hover)', marginBottom: 8, ...pulse }} />
          <div style={{ width: '80%', height: 26, borderRadius: 6, background: 'var(--bg-card-hover)', ...pulse }} />
        </div>
      ))}
    </>
  );
}

/* ─── Normalize KPI response ─────────────────────────────────────────────── */
function normalizeKpis(responseData) {
  if (!responseData) return null;
  if (Array.isArray(responseData)) return responseData.length > 0 ? responseData[0] : null;
  if (typeof responseData === 'object') return responseData;
  return null;
}

/* ─── Main export ────────────────────────────────────────────────────────── */
export default function KpiCards() {
  const filters = useDashboardFilterStore(
    useShallow(state => ({
      city:      state.city,
      disease:   state.disease,
      gender:    state.gender,
      severity:  state.severity,
      status:    state.status,
      hospital:  state.hospital,
      timeRange: state.timeRange,
    }))
  );

  const [kpis, setKpis]           = useState(null);
  const [prevKpis, setPrevKpis]   = useState(null);
  const [trendRows, setTrendRows] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const abortRef                  = useRef(null);
  const mountedRef                = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const diseaseDep = Array.isArray(filters.disease) ? filters.disease.join(',') : '';

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    // Fetch KPIs + trends in parallel — trends power the real sparkline
    Promise.all([
      getDashboardKpis(filters),
      getDashboardTrends(filters),
    ])
      .then(([kpiRes, trendRes]) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        const kpiData = normalizeKpis(kpiRes?.data);
        const prevKpiData = normalizeKpis(kpiRes?.prevData);
        console.log("KPI API Response", kpiRes);
        console.log("KPI Data Received", kpiData);
        console.log("Prev KPI Data Received", prevKpiData);
        setKpis(kpiData);
        setPrevKpis(prevKpiData);
        setTrendRows(normalizeTrends(trendRes?.data ?? trendRes));
      })
      .catch(err => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted && mountedRef.current) setLoading(false);
      });

    return () => ctrl.abort();
  }, [filters.city, diseaseDep, filters.gender, filters.severity, filters.status, filters.hospital, filters.timeRange]);

  const lastUpdated = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <KpiSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 20, background: 'var(--danger-light)', border: '1px solid var(--danger)', borderRadius: 'var(--radius)', color: 'var(--danger)', fontSize: 14 }}>
        ⚠ Failed to load KPIs: {error}
      </div>
    );
  }

  if (!kpis) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
        No data available for the selected filters.
      </div>
    );
  }

  console.log('KPI Cards Rendering Data:', kpis);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
      <HeroKpiCard 
        value={kpis.total_cases} 
        prevValue={prevKpis?.total_cases}
        trendRows={trendRows} 
        lastUpdated={lastUpdated} 
      />
      {SECONDARY_CONFIG.map(cfg => (
        <SecondaryKpiCard key={cfg.key} config={cfg} value={kpis[cfg.key]} />
      ))}
    </div>
  );
}
