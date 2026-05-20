'use client';
import React, { useEffect, useState, useRef } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow } from 'zustand/react/shallow';
import { getDashboardBubble } from '@/services/analytics.service';

// ── Severity palette ─────────────────────────────────────────────────────────
const SEVERITY_COLORS = {
  Mild:     '#22c55e',
  Moderate: '#f59e0b',
  Severe:   '#ef4444',
  Critical: '#7c3aed',
  Extreme:  '#dc2626',
};

/** Determine dominant severity color for a bubble */
function bubbleColor(row) {
  const total = Number(row.total_cases) || 1;
  const ratios = {
    Extreme:  Number(row.extreme  || 0) / total,
    Critical: Number(row.critical || 0) / total,
    Severe:   Number(row.severe   || 0) / total,
    Moderate: Number(row.moderate || 0) / total,
    Mild:     Number(row.mild     || 0) / total,
  };
  if (ratios.Extreme  > 0.10) return { color: SEVERITY_COLORS.Extreme,  name: 'Extreme'  };
  if (ratios.Critical > 0.10) return { color: SEVERITY_COLORS.Critical, name: 'Critical' };
  if (ratios.Severe   > 0.20) return { color: SEVERITY_COLORS.Severe,   name: 'Severe'   };
  if (ratios.Moderate > 0.30) return { color: SEVERITY_COLORS.Moderate, name: 'Moderate' };
  return                             { color: SEVERITY_COLORS.Mild,     name: 'Mild'     };
}

/** Normalize raw RPC rows into chart-ready objects */
function normalizeBubble(responseData) {
  let rows = [];
  if (Array.isArray(responseData)) {
    rows = responseData;
  } else if (responseData && Array.isArray(responseData.data)) {
    rows = responseData.data;
  }

  return rows.map((r) => {
    const total         = Number(r.total_cases   || 0);
    const hospital_count= Number(r.hospital_count || 1);
    const load_index    = Number(r.load_index    || (total / hospital_count));
    const dom           = bubbleColor({ ...r, total_cases: total });

    return {
      city:           r.city          || 'Unknown',
      disease_name:   r.disease_name  || 'Unknown',
      total_cases:    total,
      mild:           Number(r.mild     || 0),
      moderate:       Number(r.moderate || 0),
      severe:         Number(r.severe   || 0),
      critical:       Number(r.critical || 0),
      extreme:        Number(r.extreme  || 0),
      hospital_count,
      load_index:     Math.min(load_index, 5000), // hard clamp
      dominantColor:  dom.color,
      dominantName:   dom.name,
    };
  });
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function BubbleSkeleton() {
  return (
    <div style={{ height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-primary)', animation: 'pulse 1.5s infinite' }} />
      <div style={{ width: 140, height: 12, borderRadius: 4, background: 'var(--bg-primary)', animation: 'pulse 1.5s infinite' }} />
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '12px 16px', fontSize: 13,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)', minWidth: 200,
    }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8, color: 'var(--text-primary)' }}>
        📍 {d.city}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: 'var(--text-secondary)' }}>
        <div>🦠 Disease: <strong style={{ color: 'var(--text-primary)' }}>{d.disease_name}</strong></div>
        <div>📊 Total Cases: <strong style={{ color: '#3b82f6' }}>{Number(d.total_cases).toLocaleString()}</strong></div>
        <div>🏥 Hospitals: <strong style={{ color: '#22c55e' }}>{d.hospital_count}</strong></div>
        <div>⚡ Load Index: <strong style={{ color: '#f59e0b' }}>{Number(d.load_index).toFixed(1)} cases/hospital</strong></div>
        <div>🚦 Dominant: <strong style={{ color: d.dominantColor }}>{d.dominantName}</strong></div>
        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '6px 0' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
          <span style={{ color: SEVERITY_COLORS.Mild     }}>Mild: {d.mild}</span>
          <span style={{ color: SEVERITY_COLORS.Moderate }}>Moderate: {d.moderate}</span>
          <span style={{ color: SEVERITY_COLORS.Severe   }}>Severe: {d.severe}</span>
          <span style={{ color: SEVERITY_COLORS.Critical }}>Critical: {d.critical}</span>
          <span style={{ color: SEVERITY_COLORS.Extreme  }}>Extreme: {d.extreme}</span>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function BubbleChart() {
  const filters = useDashboardFilterStore(
    useShallow((state) => ({
      city:      state.city,
      disease:   state.disease,
      gender:    state.gender,
      severity:  state.severity,
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

    getDashboardBubble(filters)
      .then((res) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        // res = { success: true, data: [...] }
        setData(normalizeBubble(res?.data));
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
  }, [filters.city, diseaseDep, filters.gender, filters.severity, filters.timeRange]);

  // Build ordered city list for the X axis labels
  const cityIndex = [...new Set(data.map((d) => d.city))].sort();

  // Map normalized rows to scatter-plot coordinates
  const chartData = data.map((d) => ({
    ...d,
    x: cityIndex.indexOf(d.city),
    y: d.total_cases,
    z: Math.max(d.load_index, 1),
  }));

  // Clamp ZAxis range to prevent overloading SVG on large datasets
  const maxZ = Math.max(...chartData.map((d) => d.z), 1);
  const zRange = maxZ > 1000 ? [40, 600] : [60, 800];

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, height: '100%' }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(168,85,247,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 18 }}>🫧</span>
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Disease Cluster Pressure</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            X = Governorate · Y = Total Cases · Size = Load Index (cases/hospital)
          </p>
        </div>
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {Object.entries(SEVERITY_COLORS).map(([label, color]) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            {label}
          </div>
        ))}
      </div>

      {/* ── Chart Area ─────────────────────────────────────────────────── */}
      {loading ? (
        <BubbleSkeleton />
      ) : error ? (
        <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 13 }}>
          ⚠ {error}
        </div>
      ) : chartData.length === 0 ? (
        <div style={{ height: 300, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
          <span style={{ fontSize: 48 }}>🫧</span>
          <span style={{ fontSize: 14 }}>No cluster data found for the selected filters</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 10, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              type="number"
              dataKey="x"
              name="City"
              domain={[-0.5, Math.max(cityIndex.length - 0.5, 0.5)]}
              tickCount={cityIndex.length}
              tickFormatter={(v) => {
                const idx = Math.round(v);
                return cityIndex[idx] ?? '';
              }}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              interval={0}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Cases"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            />
            <ZAxis type="number" dataKey="z" range={zRange} />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={chartData} isAnimationActive={false}>
              {chartData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.dominantColor}
                  fillOpacity={0.72}
                  stroke={entry.dominantColor}
                  strokeOpacity={0.9}
                  strokeWidth={1.5}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
