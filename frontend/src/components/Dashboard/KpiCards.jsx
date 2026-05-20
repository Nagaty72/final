'use client';
import React, { useEffect, useState, useRef } from 'react';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow } from 'zustand/react/shallow';
import { getDashboardKpis } from '@/services/analytics.service';
import { Activity, Users, Hospital, TrendingUp, AlertTriangle, HeartPulse } from 'lucide-react';

const KPI_CONFIG = [
  { key: 'total_cases',     label: 'Total Cases',       icon: Activity,      color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.25)' },
  { key: 'active_cases',    label: 'Active Cases',      icon: HeartPulse,    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)' },
  { key: 'recovered',       label: 'Recovered',         icon: TrendingUp,    color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)'  },
  { key: 'severe_cases',    label: 'Severe / Critical', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)'  },
  { key: 'total_patients',  label: 'Total Patients',    icon: Users,         color: '#a855f7', bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.25)' },
  { key: 'total_hospitals', label: 'Hospitals',         icon: Hospital,      color: '#06b6d4', bg: 'rgba(6,182,212,0.1)',   border: 'rgba(6,182,212,0.25)'  },
];

function KpiSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
      {KPI_CONFIG.map((k) => (
        <div key={k.key} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 16, padding: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--bg-primary)', marginBottom: 16, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 12, width: '60%', background: 'var(--bg-primary)', borderRadius: 4, marginBottom: 12, animation: 'pulse 1.5s infinite' }} />
          <div style={{ height: 28, width: '80%', background: 'var(--bg-primary)', borderRadius: 4, animation: 'pulse 1.5s infinite' }} />
        </div>
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}

function KpiCard({ config, value }) {
  const Icon = config.icon;
  const numVal = Number(value ?? 0);
  const display = numVal >= 1_000_000
    ? `${(numVal / 1_000_000).toFixed(1)}M`
    : numVal >= 1000
      ? `${(numVal / 1000).toFixed(1)}k`
      : numVal.toLocaleString();

  return (
    <div style={{
      background: 'var(--bg-secondary)', border: `1px solid ${config.border}`,
      borderRadius: 16, padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
      transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'default',
      boxShadow: `0 2px 12px ${config.bg}`,
    }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${config.bg}`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 2px 12px ${config.bg}`; }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: config.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} style={{ color: config.color }} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {config.label}
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          {display}
        </div>
      </div>
      <div style={{ height: 3, background: 'var(--bg-primary)', borderRadius: 2, overflow: 'hidden', marginTop: 'auto' }}>
        <div style={{ width: `${Math.min((numVal / 1000) * 10, 100)}%`, height: '100%', background: config.color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

/**
 * Normalize the KPI response — the RPC may return a single-row array or a plain object.
 */
function normalizeKpis(responseData) {
  if (!responseData) return null;
  if (Array.isArray(responseData)) {
    return responseData.length > 0 ? responseData[0] : null;
  }
  if (typeof responseData === 'object') {
    return responseData;
  }
  return null;
}

export default function KpiCards() {
  const filters = useDashboardFilterStore(
    useShallow((state) => ({
      city:      state.city,
      disease:   state.disease,
      gender:    state.gender,
      severity:  state.severity,
      timeRange: state.timeRange,
    }))
  );

  const [kpis, setKpis]       = useState(null);
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

    getDashboardKpis(filters)
      .then((res) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        // res = { success: true, data: {...} | [{...}] }
        const normalized = normalizeKpis(res?.data);
        setKpis(normalized);
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

  if (loading) {
    return <KpiSkeleton />;
  }

  if (error) {
    return (
      <div style={{ padding: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, color: '#ef4444', fontSize: 14 }}>
        ⚠ Failed to load KPIs: {error}
      </div>
    );
  }

  if (!kpis) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14, background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)' }}>
        No data available for the selected filters.
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
      {KPI_CONFIG.map((cfg) => (
        <KpiCard key={cfg.key} config={cfg} value={kpis[cfg.key]} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
    </div>
  );
}
