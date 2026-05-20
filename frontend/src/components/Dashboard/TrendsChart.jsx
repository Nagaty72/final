'use client';
import React, { useEffect, useState, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow } from 'zustand/react/shallow';
import { getDashboardTrends } from '@/services/analytics.service';
import { BarChart2 } from 'lucide-react';

const BAR_COLORS = [
  '#3b82f6','#60a5fa','#818cf8','#a78bfa','#c084fc',
  '#e879f9','#f472b6','#fb7185','#f87171','#fbbf24',
  '#34d399','#2dd4bf',
];

function TrendsSkeleton() {
  return (
    <div style={{ height: 280, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '0 4px' }}>
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 6,
          height: `${30 + (i * 7) % 60}%`,
          background: 'var(--bg-primary)',
          animation: 'pulse 1.5s infinite',
          animationDelay: `${i * 80}ms`,
        }} />
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', fontSize: 13, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ color: '#60a5fa' }}>Cases: <strong>{Number(payload[0]?.value ?? 0).toLocaleString()}</strong></div>
    </div>
  );
};

/**
 * Normalize trends response — expects an array of { month, year, count } objects.
 * Backend RPC: get_dashboard_trends
 */
function normalizeTrends(responseData) {
  let rows = [];
  if (Array.isArray(responseData)) {
    rows = responseData;
  } else if (responseData && Array.isArray(responseData.data)) {
    rows = responseData.data;
  }
  return rows.map((r) => ({
    label: `${r.month ?? ''} ${r.year ?? ''}`.trim(),
    count: Number(r.count ?? r.total_cases ?? 0),
  })).filter((r) => r.label !== '');
}

export default function TrendsChart() {
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

    getDashboardTrends(filters)
      .then((res) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        // res = { success: true, data: [...] }
        setData(normalizeTrends(res?.data));
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

  return (
    <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <BarChart2 size={18} style={{ color: '#3b82f6' }} />
        </div>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>Case Trends</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Monthly distribution over selected period</p>
        </div>
      </div>

      {loading ? (
        <TrendsSkeleton />
      ) : error ? (
        <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', fontSize: 13 }}>
          ⚠ {error}
        </div>
      ) : data.length === 0 ? (
        <div style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 8 }}>
          <BarChart2 size={40} style={{ opacity: 0.3 }} />
          <span style={{ fontSize: 14 }}>No trend data for this filter combination</span>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ top: 10, right: 8, left: -20, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false} tickLine={false}
              interval={data.length > 14 ? Math.floor(data.length / 10) : 0}
            />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48} isAnimationActive={false}>
              {data.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
