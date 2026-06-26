'use client';
import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useDashboardData } from '@/context/DashboardDataContext';
import { Activity } from 'lucide-react';
import { TOP_DISEASES_PALETTE, tooltipStyle, gridStyle, axisTick, tooltipCursorBar } from '@/lib/chartTheme';

function BreakdownSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 100, height: 12, borderRadius: 4, background: 'var(--bg-primary)', animation: 'pulse 1.5s infinite' }} />
          <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg-primary)', animation: 'pulse 1.5s infinite', animationDelay: `${i * 100}ms` }} />
        </div>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={tooltipStyle()}>
      <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        {d.payload?.name}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        <span>Cases</span>
        <strong style={{ color: d.fill }}>{Number(d.value).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>
        <span>Share</span>
        <span>{d.payload?.pct}% of total</span>
      </div>
    </div>
  );
};

/**
 * Normalize disease breakdown response.
 * Backend RPC: get_dashboard_disease_breakdown
 * Expected shape: [{ disease_name, total_cases }]
 */
function normalizeBreakdown(responseData) {
  let rows = [];
  if (Array.isArray(responseData)) {
    rows = responseData;
  } else if (responseData && Array.isArray(responseData.data)) {
    rows = responseData.data;
  }

  // Deduplicate by disease name — aggregate case counts if backend returns duplicates
  const dedupMap = new Map();
  for (const r of rows) {
    const name = r.disease_name ?? r.name ?? 'Unknown';
    const count = Number(r.total_cases ?? r.count ?? 0);
    if (dedupMap.has(name)) {
      dedupMap.get(name).count += count;
    } else {
      dedupMap.set(name, { name, count });
    }
  }
  const deduped = Array.from(dedupMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const total = deduped.reduce((s, r) => s + r.count, 0) || 1;

  return deduped.map((r, i) => ({
    name:  r.name,
    cases: r.count,
    pct:   Math.round((r.count / total) * 100),
    color: TOP_DISEASES_PALETTE[i % TOP_DISEASES_PALETTE.length],
  }));
}

export default function DiseaseBreakdown() {
  const { breakdownRaw, loading, error } = useDashboardData();
  const data = useMemo(() => normalizeBreakdown(breakdownRaw?.data), [breakdownRaw]);

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px 28px',
      height: '100%',
      boxShadow: 'var(--shadow-sm)',
      transition: 'box-shadow 0.25s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(124,58,237,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 0 1px rgba(124,58,237,0.2)',
        }}>
          <Activity size={18} style={{ color: '#7c3aed' }} />
        </div>
        <div>
          <h2 style={{
            fontSize: 15, fontWeight: 700, margin: 0,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
          }}>Top Diseases</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0' }}>Ranked by case volume</p>
        </div>
      </div>

      {loading ? (
        <BreakdownSkeleton />
      ) : error ? (
        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 13 }}>⚠ {error}</div>
      ) : data.length === 0 ? (
        <div style={{ height: 220, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
          <Activity size={40} style={{ opacity: 0.3 }} />
          <span style={{ fontSize: 14 }}>No disease data for this selection</span>
        </div>
      ) : (
        <div style={{ width: '100%', height: 220, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis
                type="number" tick={axisTick}
                axisLine={false} tickLine={false}
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              />
              <YAxis
                type="category" dataKey="name" width={110}
                tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontWeight: 500 }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={tooltipCursorBar} />
              <Bar dataKey="cases" radius={[0, 7, 7, 0]} maxBarSize={22} isAnimationActive={false}>
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
