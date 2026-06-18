'use client';
import React, { useEffect, useState, useRef } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow } from 'zustand/react/shallow';
import { getDashboardSeverity } from '@/services/analytics.service';
import { SEVERITY_PALETTE as THEME_SEVERITY, tooltipStyle } from '@/lib/chartTheme';

const SEVERITY_ORDER   = ['Mild', 'Moderate', 'Severe', 'Critical', 'Extreme'];
const SEVERITY_PALETTE = THEME_SEVERITY;
const FALLBACK_COLOR   = '#7B8FA8';

function SeveritySkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
      <div style={{ width: 160, height: 160, borderRadius: '50%', background: 'var(--bg-primary)', animation: 'pulse 1.5s infinite' }} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={tooltipStyle()}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.payload?.fill, flexShrink: 0 }} />
        <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{d.name}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--text-secondary)', fontSize: 12 }}>
        <span>Cases</span>
        <strong style={{ color: 'var(--text-primary)' }}>{Number(d.value).toLocaleString()}</strong>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: 'var(--text-muted)', fontSize: 11, marginTop: 3 }}>
        <span>Share</span>
        <span>{d.payload?.pct}%</span>
      </div>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, pct }) => {
  if (pct < 5) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {pct}%
    </text>
  );
};

/**
 * Normalize severity response — expects an array of { severity, count } objects.
 * Backend RPC: get_dashboard_severity
 */
function normalizeSeverity(responseData) {
  let rows = [];
  if (Array.isArray(responseData)) {
    rows = responseData;
  } else if (responseData && Array.isArray(responseData.data)) {
    rows = responseData.data;
  }

  const total = rows.reduce((s, r) => s + Number(r.count ?? r.total_cases ?? 0), 0) || 1;

  // Sort by canonical severity order
  const sorted = [...rows].sort((a, b) => {
    const ai = SEVERITY_ORDER.indexOf(a.severity);
    const bi = SEVERITY_ORDER.indexOf(b.severity);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Deduplicate by severity label — aggregate counts if backend returns duplicates
  const dedupMap = new Map();
  for (const r of sorted) {
    const key = r.severity || 'Unknown';
    if (dedupMap.has(key)) {
      dedupMap.get(key).count += Number(r.count ?? r.total_cases ?? 0);
    } else {
      dedupMap.set(key, { ...r, count: Number(r.count ?? r.total_cases ?? 0) });
    }
  }
  const deduped = Array.from(dedupMap.values());
  const dedupeTotal = deduped.reduce((s, r) => s + r.count, 0) || 1;

  return deduped.map((r) => ({
    name:  r.severity || 'Unknown',
    value: r.count,
    pct:   Math.round((r.count / dedupeTotal) * 100),
    fill:  SEVERITY_PALETTE[r.severity] || FALLBACK_COLOR,
  }));
}

export default function SeverityChart() {
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

  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const abortRef              = useRef(null);
  const mountedRef            = useRef(true);

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

    getDashboardSeverity(filters)
      .then((res) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        // res = { success: true, data: [...] }
        setData(normalizeSeverity(res?.data));
      })
      .catch((err) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted && mountedRef.current) {
          setLoading(false);
        }
      });

    return () => ctrl.abort();
  }, [filters.city, diseaseDep, filters.gender, filters.severity, filters.status, filters.hospital, filters.timeRange]);

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
      <div style={{ marginBottom: 20 }}>
        <h2 style={{
          fontSize: 15, fontWeight: 700, margin: '0 0 2px',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
        }}>Severity Distribution</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Case breakdown by clinical severity level</p>
      </div>

      {loading ? (
        <SeveritySkeleton />
      ) : error ? (
        <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 13 }}>⚠ {error}</div>
      ) : data.length === 0 ? (
        <div style={{ height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
          <span style={{ fontSize: 40 }}>📊</span>
          <span style={{ fontSize: 14 }}>No severity data for this selection</span>
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={data} cx="50%" cy="50%"
                innerRadius={58} outerRadius={92}
                paddingAngle={2} dataKey="value"
                labelLine={false} label={renderCustomLabel}
                isAnimationActive={false}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} stroke="var(--bg-secondary)" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, justifyContent: 'center' }}>
            {data.map((d, i) => (
              <div key={`sev-${d.name}-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 11, color: 'var(--text-secondary)',
                background: 'var(--bg-card-hover)',
                padding: '4px 10px', borderRadius: 100,
                border: '1px solid var(--border)',
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, flexShrink: 0, boxShadow: `0 0 4px ${d.fill}88` }} />
                <span style={{ fontWeight: 600 }}>{d.name}</span>
                <span style={{ color: d.fill, fontWeight: 700 }}>{d.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
