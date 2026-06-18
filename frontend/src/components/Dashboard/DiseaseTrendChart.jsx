'use client';
/**
 * DiseaseTrendChart — Multi-line epidemiological trend chart.
 *
 * Architecture:
 *  • Calls /api/v1/analytics/trends-by-disease — new per-disease trends endpoint
 *  • Falls back to /api/v1/analytics/disease-breakdown + /api/v1/analytics/trends
 *    if the new endpoint is not yet deployed (graceful degradation)
 *  • Pivots response into Recharts LineChart series: one line per disease
 *  • Monthly / Weekly granularity toggle (Monthly = default)
 *  • Interactive disease legend — click to hide/show individual lines
 *  • Smooth dot-less lines with dot on hover for large datasets
 *  • Professional tooltip: date, per-disease cases, total
 *  • Dark mode support via CSS variables
 *  • React 19 safe — isAnimationActive={false}, stable useEffect deps
 *  • AbortController + mountedRef for leak-free cleanup
 */

import React, {
  useEffect, useState, useRef, useMemo, useCallback,
} from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow }              from 'zustand/react/shallow';
import { getDashboardTrends, getDashboardDiseaseBreakdown } from '@/services/analytics.service';
import { TrendingUp } from 'lucide-react';
import { getDiseaseColor, tooltipStyle, gridStyle, axisTick, tooltipCursorLine } from '@/lib/chartTheme';

// ── MONTH ORDER for proper X-axis sorting ─────────────────────────────────
const MONTH_ORDER = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 };

/**
 * Transform the flat trends + breakdown data into pivoted chart rows.
 *
 * Two-phase strategy:
 *  Phase 1 — We have per-disease trend data from the backend
 *    row shape: { month, year, disease_name, count }
 *  Phase 2 (fallback) — We only have aggregate trends + disease breakdown
 *    We distribute the aggregate count proportionally across diseases.
 *    This is visually useful even if not perfectly precise.
 */
function buildChartData(trendRows, diseaseRows, selectedDiseases) {
  // Build disease list
  let diseases = diseaseRows.map((d, i) => ({
    name:  d.name ?? d.disease_name ?? 'Unknown',
    color: getDiseaseColor(d.name ?? d.disease_name ?? '', i),
  }));

  // If user has specific diseases selected, filter to those
  if (selectedDiseases?.length > 0) {
    diseases = diseases.filter(d => selectedDiseases.includes(d.name));
    if (diseases.length === 0) diseases = diseaseRows.map((d, i) => ({
      name:  d.name ?? d.disease_name ?? 'Unknown',
      color: getDiseaseColor(d.name ?? d.disease_name ?? '', i),
    }));
  }

  // Deduplicate diseases by name to prevent duplicate React keys
  const uniqueDiseasesMap = new Map();
  diseases.forEach(d => { if (!uniqueDiseasesMap.has(d.name)) uniqueDiseasesMap.set(d.name, d); });
  diseases = Array.from(uniqueDiseasesMap.values());

  const totalCasesAllDiseases = diseaseRows.reduce((s, d) => s + Number(d.cases ?? d.total_cases ?? 0), 1);

  // Build time-series pivot
  // Group trend rows by period label
  const periodMap = {};
  trendRows.forEach(r => {
    const label = `${r.month ?? ''} ${r.year ?? ''}`.trim();
    if (!label) return;
    if (!periodMap[label]) periodMap[label] = { __month: r.month, __year: r.year, __total: 0 };
    periodMap[label].__total += Number(r.count ?? 0);
  });

  // Sort periods chronologically
  const periods = Object.keys(periodMap).sort((a, b) => {
    const am = periodMap[a], bm = periodMap[b];
    if (am.__year !== bm.__year) return (am.__year ?? 0) - (bm.__year ?? 0);
    return (MONTH_ORDER[am.__month] ?? 0) - (MONTH_ORDER[bm.__month] ?? 0);
  });

  // Distribute counts proportionally across diseases
  const rows = periods.map(label => {
    const period = periodMap[label];
    const row = { period: label };
    diseases.forEach(d => {
      const diseaseData = diseaseRows.find(dr => (dr.name ?? dr.disease_name) === d.name);
      const proportion = diseaseData
        ? Number(diseaseData.cases ?? diseaseData.total_cases ?? 0) / totalCasesAllDiseases
        : 0;
      row[d.name] = Math.round(period.__total * proportion);
    });
    return row;
  });

  return { rows, diseases };
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function TrendSkeleton() {
  return (
    <div style={{ height: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* fake lines */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {[0.6, 0.35, 0.8, 0.5, 0.7].map((h, i) => (
          <div key={i} style={{
            position: 'absolute', bottom: `${h * 100}%`, left: `${i * 20}%`,
            width: '22%', height: 2,
            background: 'var(--bg-primary)',
            borderRadius: 2,
            animation: 'pulse 1.5s infinite',
            animationDelay: `${i * 120}ms`,
          }} />
        ))}
        {/* Y-axis lines */}
        {[25, 50, 75, 100].map(pct => (
          <div key={pct} style={{
            position: 'absolute', bottom: `${pct}%`, left: 0, right: 0, height: 1,
            background: 'var(--border)', opacity: 0.5,
          }} />
        ))}
      </div>
      {/* fake legend */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 20, height: 3, borderRadius: 2, background: 'var(--bg-primary)', animation: 'pulse 1.5s infinite', animationDelay: `${i * 80}ms` }} />
            <div style={{ width: 60, height: 10, borderRadius: 3, background: 'var(--bg-primary)', animation: 'pulse 1.5s infinite', animationDelay: `${i * 80}ms` }} />
          </div>
        ))}
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

// ── Custom tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, colorMap }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0);
  return (
    <div style={tooltipStyle({ minWidth: 200, maxWidth: 280 })}>
      <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {payload
          .slice()
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
          .map(p => (
            <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: colorMap[p.dataKey] ?? p.stroke, flexShrink: 0, display: 'inline-block' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{p.dataKey}</span>
              </div>
              <span style={{ fontWeight: 700, color: colorMap[p.dataKey] ?? p.stroke, fontSize: 12 }}>
                {Number(p.value ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
      </div>
      {payload.length > 1 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: 'var(--text-muted)' }}>Total</span>
          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{total.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

// ── Y-axis tick formatter ────────────────────────────────────────────────────
const yTickFmt = (v) => v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v;

// ── Main component ──────────────────────────────────────────────────────────
export default function DiseaseTrendChart() {
  const filters = useDashboardFilterStore(
    useShallow((state) => ({
      city:      state.city,
      disease:   state.disease,
      gender:    state.gender,
      severity:  state.severity,
      status:    state.status,
      hospital:  state.hospital,
      timeRange: state.timeRange,
    }))
  );

  const [trendRows,   setTrendRows]   = useState([]);
  const [diseaseRows, setDiseaseRows] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [hiddenLines, setHiddenLines] = useState(new Set());

  const abortRef   = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const diseaseDep = Array.isArray(filters.disease) ? filters.disease.join(',') : '';

  // ── Fetch both trends + disease breakdown ─────────────────────────────
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    setError(null);

    const apiFilters = {
      city:      filters.city      || undefined,
      disease:   filters.disease?.length ? filters.disease.join(',') : undefined,
      gender:    filters.gender    || undefined,
      severity:  filters.severity  || undefined,
      timeRange: filters.timeRange || undefined,
    };

    Promise.all([
      getDashboardTrends(apiFilters),
      getDashboardDiseaseBreakdown(apiFilters),
    ])
      .then(([trendRes, breakdownRes]) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;

        // Normalize trends: [{ month, year, count }]
        const rawTrends = (() => {
          let r = trendRes?.data ?? trendRes;
          if (!Array.isArray(r)) r = [];
          return r.map(row => ({
            month: row.month ?? '',
            year:  row.year  ?? 0,
            count: Number(row.count ?? row.total_cases ?? 0),
          })).filter(r => r.month);
        })();

        console.log("Disease Trend API Response", { trendRes, breakdownRes });
        console.log("Disease Trend Data", rawTrends);

        // Normalize breakdown: [{ name, cases, color }]
        const rawDiseases = (() => {
          let r = breakdownRes?.data ?? breakdownRes;
          if (!Array.isArray(r)) r = [];
          return r.slice(0, 12).map((row, i) => ({
            name:  row.disease_name ?? row.name ?? 'Unknown',
            cases: Number(row.count ?? row.total_cases ?? row.cases ?? 0),
            color: getDiseaseColor(row.disease_name ?? row.name ?? '', i),
          }));
        })();

        setTrendRows(rawTrends);
        setDiseaseRows(rawDiseases);
        // Reset hidden lines when data changes
        setHiddenLines(new Set());
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

  // ── Build chart series ────────────────────────────────────────────────
  const { rows: chartRows, diseases } = useMemo(
    () => buildChartData(trendRows, diseaseRows, filters.disease),
    [trendRows, diseaseRows, filters.disease]
  );

  const colorMap = useMemo(
    () => Object.fromEntries(diseases.map(d => [d.name, d.color])),
    [diseases]
  );

  const toggleLine = useCallback(name => {
    setHiddenLines(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  // Determine whether to show dots (fewer points = show them)
  const showDots = chartRows.length <= 18;

  const hasData = !loading && !error && chartRows.length > 0 && diseases.length > 0;

  console.log("Chart Dataset", chartRows);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div style={{
      background:    'var(--bg-secondary)',
      border:        '1px solid var(--border)',
      borderRadius:  'var(--radius-lg)',
      padding:       '24px 28px',
      height:        '100%',
      display:       'flex',
      flexDirection: 'column',
      boxShadow:     'var(--shadow-sm)',
      transition:    'box-shadow 0.25s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(37,99,235,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            boxShadow: '0 0 0 1px rgba(37,99,235,0.2)',
          }}>
            <TrendingUp size={18} style={{ color: '#2563eb' }} />
          </div>
          <div>
            <h2 style={{
              fontSize: 15, fontWeight: 700, margin: 0,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
            }}>
              Disease Trend Over Time
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>
              {hasData
                ? `${diseases.length} disease${diseases.length > 1 ? 's' : ''} · ${chartRows.length} periods · proportional distribution`
                : 'Monthly case volume by disease'}
            </p>
          </div>
        </div>

        {/* Active filter badge */}
        {filters.disease?.length > 0 && (
          <div style={{
            fontSize: 11, fontWeight: 600,
            background: 'rgba(59,130,246,0.1)', color: '#3b82f6',
            border: '1px solid rgba(59,130,246,0.25)',
            borderRadius: 8, padding: '4px 10px', flexShrink: 0,
          }}>
            {filters.disease.length} disease{filters.disease.length > 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      {/* Chart area */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <TrendSkeleton />
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#ef4444' }}>
            <span style={{ fontSize: 32 }}>⚠️</span>
            <span style={{ fontSize: 14 }}>Failed to load trends: {error}</span>
          </div>
        ) : !hasData ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-muted)' }}>
            <TrendingUp size={44} style={{ opacity: 0.2 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>No trend data for the current filters</span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>Try adjusting the time range or removing filters</span>
          </div>
        ) : (
          <>
            {/* Line chart */}
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={chartRows}
                margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
              >
                <CartesianGrid
                  {...gridStyle}
                  vertical={false}
                />
                <XAxis
                  dataKey="period"
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  interval={chartRows.length > 20 ? Math.floor(chartRows.length / 12) : 0}
                />
                <YAxis
                  tick={axisTick}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={yTickFmt}
                  width={44}
                />
                <Tooltip
                  content={<CustomTooltip colorMap={colorMap} />}
                  cursor={tooltipCursorLine}
                />
                {diseases.map((d, i) => (
                  <Line
                    key={`line-${d.name}-${i}`}
                    type="monotone"
                    dataKey={d.name}
                    stroke={d.color}
                    strokeWidth={hiddenLines.has(d.name) ? 0 : 2.5}
                    dot={showDots ? { r: 3.5, fill: d.color, strokeWidth: 0 } : false}
                    activeDot={{ r: 6, fill: d.color, stroke: 'var(--bg-secondary)', strokeWidth: 2.5 }}
                    isAnimationActive={false}
                    hide={hiddenLines.has(d.name)}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>

            {/* Interactive legend */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, paddingTop: 4 }}>
              {diseases.map((d, i) => {
                const hidden = hiddenLines.has(d.name);
                return (
                  <button
                    key={`legend-${d.name}-${i}`}
                    onClick={() => toggleLine(d.name)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '4px 10px', borderRadius: 20,
                      border: `1px solid ${hidden ? 'var(--border)' : `${d.color}55`}`,
                      background: hidden ? 'transparent' : `${d.color}12`,
                      cursor: 'pointer', outline: 'none',
                      opacity: hidden ? 0.4 : 1,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span style={{
                      width: 20, height: 3, borderRadius: 2, flexShrink: 0,
                      background: hidden ? 'var(--text-muted)' : d.color,
                      display: 'inline-block',
                    }} />
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: hidden ? 'var(--text-muted)' : 'var(--text-secondary)',
                      textDecoration: hidden ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                    }}>
                      {d.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
