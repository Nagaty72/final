'use client';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow } from 'zustand/react/shallow';
import {
  getDashboardKpis,
  getDashboardDiseaseBreakdown,
  getDashboardSeverity,
} from '@/services/analytics.service';
import { FileText, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ─── Normalize helpers ───────────────────────────────────────────────────── */
function normalizeKpis(d) {
  if (!d) return null;
  if (Array.isArray(d)) return d[0] ?? null;
  return d;
}

function normalizeBreakdown(d) {
  let rows = Array.isArray(d) ? d : (d?.data ?? []);
  const map = new Map();
  for (const r of rows) {
    const name  = r.disease_name ?? r.name ?? 'Unknown';
    const count = Number(r.total_cases ?? r.count ?? 0);
    if (map.has(name)) map.get(name).count += count;
    else map.set(name, { name, count });
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}

function normalizeSeverity(d) {
  let rows = Array.isArray(d) ? d : (d?.data ?? []);
  return rows.map(r => ({
    name:  r.severity ?? 'Unknown',
    count: Number(r.count ?? r.total_cases ?? 0),
  }));
}

/* ─── Generate intelligence prose from real stats ─────────────────────────── */
function generateSummary({ kpis, breakdown, severity, filters }) {
  if (!kpis) return null;

  const totalCases    = Number(kpis.total_cases    ?? 0);
  const activeCases   = Number(kpis.active_cases   ?? 0);
  const recovered     = Number(kpis.recovered      ?? 0);
  const severeCases   = Number(kpis.severe_cases   ?? 0);
  const totalPatients = Number(kpis.total_patients ?? 0);
  const hospitals     = Number(kpis.total_hospitals ?? 0);

  const lines = [];

  // ── Overview line ──
  if (totalCases > 0) {
    const fmtN = n =>
      n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` :
      n >= 1_000     ? `${(n / 1_000).toFixed(1)}k` : n.toLocaleString();

    const scopeLabel = filters.city
      ? `in ${filters.city}`
      : filters.disease?.length === 1
        ? `for ${filters.disease[0]}`
        : 'across all governorates';

    lines.push({
      type: 'stat',
      text: `A total of ${fmtN(totalCases)} cases recorded ${scopeLabel}${filters.timeRange && filters.timeRange !== '1y' ? ` over the selected period` : ''}.`,
    });
  }

  // ── Disease dominance line ──
  if (breakdown.length > 0) {
    const top3 = breakdown.slice(0, 3).map(d => d.name);
    const topTotal = breakdown.slice(0, 3).reduce((s, d) => s + d.count, 1);
    const allTotal = breakdown.reduce((s, d) => s + d.count, 1);
    const topPct   = Math.round((topTotal / allTotal) * 100);

    if (top3.length === 1) {
      lines.push({
        type: 'disease',
        text: `${top3[0]} accounts for the majority of reported cases in this dataset.`,
      });
    } else {
      lines.push({
        type: 'disease',
        text: `${top3.slice(0, -1).join(', ')} and ${top3[top3.length - 1]} are the leading conditions, comprising ${topPct}% of total reported cases.`,
      });
    }
  }

  // ── Recovery vs Active line ──
  if (totalCases > 0) {
    const recoveryRate = Math.round((recovered / totalCases) * 100);
    const activeRate   = Math.round((activeCases / totalCases) * 100);
    if (recoveryRate > 0 || activeRate > 0) {
      let statusLine = '';
      if (recoveryRate >= 60) {
        statusLine = `Recovery performance is strong at ${recoveryRate}% of total cases. Active cases represent ${activeRate}% of the caseload.`;
      } else if (activeRate > 40) {
        statusLine = `Active cases remain elevated at ${activeRate}% of the total caseload. Recovery rate stands at ${recoveryRate}%.`;
      } else {
        statusLine = `${recoveryRate}% of total cases have recovered. Active cases account for ${activeRate}% of the caseload.`;
      }
      lines.push({ type: 'recovery', text: statusLine });
    }
  }

  // ── Severity line ──
  if (severity.length > 0) {
    const totalSev    = severity.reduce((s, r) => s + r.count, 0) || 1;
    const criticalRow = severity.find(r => ['Critical', 'Extreme', 'Severe'].includes(r.name));
    const mildRow     = severity.find(r => r.name === 'Mild');

    if (criticalRow) {
      const critPct = Math.round((criticalRow.count / totalSev) * 100);
      if (critPct >= 20) {
        lines.push({
          type: 'alert',
          text: `${critPct}% of cases present as ${criticalRow.name.toLowerCase()} — clinical escalation monitoring is recommended.`,
        });
      } else if (mildRow) {
        const mildPct = Math.round((mildRow.count / totalSev) * 100);
        lines.push({
          type: 'positive',
          text: `Severity profile is stable — ${mildPct}% of cases are classified as mild. ${critPct > 0 ? `${critPct}% remain critical-tier.` : ''}`,
        });
      }
    }
  }

  // ── Capacity line ──
  if (hospitals > 0 && totalPatients > 0) {
    const avgLoad = Math.round(totalPatients / hospitals);
    lines.push({
      type: 'capacity',
      text: `${hospitals} hospital${hospitals > 1 ? 's' : ''} registered with an average patient load of ${avgLoad.toLocaleString()} per facility.`,
    });
  }

  // ── Severe cases alert ──
  if (severeCases > 0 && totalCases > 0) {
    const severePct = Math.round((severeCases / totalCases) * 100);
    if (severePct >= 10) {
      lines.push({
        type: 'alert',
        text: `${severePct}% of cases (${severeCases.toLocaleString()}) are classified as severe or critical — elevated surveillance recommended.`,
      });
    }
  }

  return lines;
}

/* ─── Line type → visual config ──────────────────────────────────────────── */
const LINE_CONFIG = {
  stat:     { color: 'var(--accent)',   bg: 'rgba(37,99,235,0.06)',   icon: '◈', label: 'Overview' },
  disease:  { color: 'var(--purple)',   bg: 'rgba(124,58,237,0.06)',  icon: '◈', label: 'Conditions' },
  recovery: { color: 'var(--success)',  bg: 'rgba(5,150,105,0.06)',   icon: '◈', label: 'Recovery' },
  alert:    { color: 'var(--danger)',   bg: 'rgba(220,38,38,0.06)',   icon: '◈', label: 'Alert' },
  positive: { color: 'var(--success)',  bg: 'rgba(5,150,105,0.06)',   icon: '◈', label: 'Severity' },
  capacity: { color: 'var(--cyan)',     bg: 'rgba(6,182,212,0.06)',   icon: '◈', label: 'Capacity' },
};

/* ─── Loading skeleton ────────────────────────────────────────────────────── */
function ExecSkeleton() {
  const pulse = { animation: 'exec-pulse 1.5s ease-in-out infinite' };
  return (
    <>
      <style>{`@keyframes exec-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[100, 85, 90, 75].map((w, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 2, height: 36, borderRadius: 2, background: 'var(--bg-card-hover)', flexShrink: 0, ...pulse }} />
            <div style={{ width: `${w}%`, height: 14, borderRadius: 4, background: 'var(--bg-card-hover)', ...pulse }} />
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ExecutiveSummary() {
  const filters = useDashboardFilterStore(
    useShallow(state => ({
      city:      state.city,
      disease:   state.disease,
      gender:    state.gender,
      severity:  state.severity,
      timeRange: state.timeRange,
    }))
  );

  const [kpis,      setKpis]      = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [severity,  setSeverity]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [genTime,   setGenTime]   = useState(null);
  const abortRef   = useRef(null);
  const mountedRef = useRef(true);

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

    Promise.all([
      getDashboardKpis(filters),
      getDashboardDiseaseBreakdown(filters),
      getDashboardSeverity(filters),
    ])
      .then(([kpiRes, breakdownRes, severityRes]) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        setKpis(normalizeKpis(kpiRes?.data));
        setBreakdown(normalizeBreakdown(breakdownRes?.data ?? breakdownRes));
        setSeverity(normalizeSeverity(severityRes?.data ?? severityRes));
        setGenTime(new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
      })
      .catch(err => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted && mountedRef.current) setLoading(false);
      });

    return () => ctrl.abort();
  }, [filters.city, diseaseDep, filters.gender, filters.severity, filters.timeRange]);

  const summaryLines = useMemo(
    () => generateSummary({ kpis, breakdown, severity, filters }),
    [kpis, breakdown, severity, filters]
  );

  const hasAlert = summaryLines?.some(l => l.type === 'alert');

  // ── Active filter tags for context ──
  const activeTags = [
    filters.city && `Governorate: ${filters.city}`,
    filters.disease?.length && `${filters.disease.length} disease${filters.disease.length > 1 ? 's' : ''}`,
    filters.gender && `Gender: ${filters.gender}`,
    filters.severity && `Severity: ${filters.severity}`,
    filters.timeRange && filters.timeRange !== '1y' && `Period: ${filters.timeRange}`,
  ].filter(Boolean);

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: `1px solid ${hasAlert ? 'rgba(220,38,38,0.25)' : 'var(--border)'}`,
      borderRadius: 'var(--radius-lg)',
      padding: '24px 28px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: hasAlert ? '0 0 0 1px rgba(220,38,38,0.1), var(--shadow-sm)' : 'var(--shadow-sm)',
      transition: 'box-shadow 0.25s ease, border-color 0.25s ease',
    }}>

      {/* Top accent line — shifts to danger if alert present */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: hasAlert
          ? 'linear-gradient(90deg, #dc2626, #f59e0b)'
          : 'linear-gradient(90deg, #2563eb, #8b5cf6, #06b6d4)',
      }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: hasAlert ? 'var(--danger-light)' : 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 1px ${hasAlert ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.2)'}`,
          }}>
            <FileText size={17} style={{ color: hasAlert ? 'var(--danger)' : 'var(--accent)' }} />
          </div>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
            }}>
              Executive Summary
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
              Derived from live dataset · Not AI-generated
            </div>
          </div>
        </div>

        {/* Right side: timestamp + filter context */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          {genTime && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 10, color: 'var(--text-muted)',
              background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
              borderRadius: 100, padding: '3px 10px',
            }}>
              <RefreshCw size={9} />
              Generated {genTime}
            </span>
          )}
          {activeTags.length > 0 && (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {activeTags.map((tag, i) => (
                <span key={i} style={{
                  fontSize: 10, fontWeight: 600, color: 'var(--accent)',
                  background: 'var(--accent-light)', borderRadius: 100,
                  padding: '2px 8px',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'var(--border)', marginBottom: 20, opacity: 0.6 }} />

      {/* Content */}
      {loading ? (
        <ExecSkeleton />
      ) : error ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)', fontSize: 13 }}>
          <AlertCircle size={16} />
          Unable to generate summary: {error}
        </div>
      ) : !summaryLines || summaryLines.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          No data available to generate an executive summary for the current filter selection.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {summaryLines.map((line, i) => {
            const cfg   = LINE_CONFIG[line.type] ?? LINE_CONFIG.stat;
            const isLast = i === summaryLines.length - 1;
            return (
              <div
                key={i}
                style={{
                  display: 'flex', gap: 16, alignItems: 'flex-start',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'transparent',
                  transition: 'background 0.15s ease',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  marginBottom: isLast ? 0 : 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = cfg.bg; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Left accent bar */}
                <div style={{
                  width: 3, minHeight: 20, borderRadius: 2,
                  background: cfg.color, flexShrink: 0, marginTop: 1,
                  boxShadow: `0 0 6px ${cfg.color}60`,
                }} />

                {/* Label + text */}
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, color: cfg.color,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    display: 'inline-block', marginBottom: 3,
                    background: `${cfg.color}15`,
                    padding: '1px 6px', borderRadius: 4,
                  }}>
                    {cfg.label}
                  </span>
                  <p style={{
                    margin: 0,
                    fontSize: 13, lineHeight: 1.65,
                    color: 'var(--text-secondary)',
                    fontWeight: line.type === 'alert' ? 500 : 400,
                  }}>
                    {line.text}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      {!loading && summaryLines && summaryLines.length > 0 && (
        <div style={{
          marginTop: 16, paddingTop: 14,
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This summary is automatically derived from live database statistics. It reflects the current filter selection and does not constitute a clinical or epidemiological assessment.
          </span>
          <span style={{
            fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
            background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
            borderRadius: 100, padding: '3px 10px', flexShrink: 0,
          }}>
            {summaryLines.length} insight{summaryLines.length > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  );
}
