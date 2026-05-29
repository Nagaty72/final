'use client';
/**
 * IntelligenceMapPage — Data-fetching orchestrator for the Disease Intelligence Map.
 *
 * Responsibilities:
 *  • Manages local filter state (city, disease[], gender, severity, timeRange)
 *  • Fetches bubble data + KPIs using AbortController + mountedRef
 *  • Passes processed data to:
 *    - MapFilterPanel (sidebar)
 *    - IntelligenceMapView (map, dynamic import)
 *    - MapLegend (map overlay)
 *  • Owns Heat/Bubble mode toggle
 *  • Owns fullscreen state
 *  • Owns hiddenDiseases Set
 *
 * Stability: React 19 safe, no render loops, useMemo for all derived data.
 */

import React, {
  useState, useEffect, useRef, useMemo, useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Maximize2, Minimize2, Globe, Flame, Circle } from 'lucide-react';
import { getDashboardBubble, getDashboardKpis, getDiseaseList, getCityList } from '@/services/analytics.service';
import MapFilterPanel from './MapFilterPanel';
import MapLegend      from './MapLegend';
import { normalizeGovName, GOVERNORATE_COORDS } from './IntelligenceMapView';
import { getDiseaseColor } from '@/lib/chartTheme';

// ── SSR-safe dynamic import ─────────────────────────────────────────────────
const IntelligenceMapView = dynamic(
  () => import('./IntelligenceMapView'),
  { ssr: false, loading: () => <MapLoadingSkeleton /> }
);



// ── Normalise raw RPC rows ──────────────────────────────────────────────────
function normalizeRows(res) {
  let raw = [];
  if (Array.isArray(res))               raw = res;
  else if (res?.data && Array.isArray(res.data)) raw = res.data;
  return raw.map(r => ({
    city:           String(r.city          || 'Unknown'),
    disease_name:   String(r.disease_name  || 'Unknown'),
    total_cases:    Number(r.total_cases   || 0),
    hospital_count: Number(r.hospital_count || 1),
    mild:           Number(r.mild     || 0),
    moderate:       Number(r.moderate || 0),
    severe:         Number(r.severe   || 0),
    critical:       Number(r.critical || 0),
    extreme:        Number(r.extreme  || 0),
    load_index:     Number(r.load_index || 0),
  })).filter(r => r.total_cases > 0);
}

function normalizeKpis(res) {
  if (!res) return {};
  const d = res?.data ?? res;
  if (Array.isArray(d)) return d[0] ?? {};
  return typeof d === 'object' ? d : {};
}

// ── Loading skeleton ────────────────────────────────────────────────────────
function MapLoadingSkeleton() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: '#3b82f6', animation: 'spin 0.9s linear infinite' }} />
      <span style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500 }}>Loading Disease Intelligence Map…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Mode toggle button ──────────────────────────────────────────────────────
function ModeButton({ active, onClick, icon: Icon, label, activeColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '7px 16px', borderRadius: 20, border: 'none', cursor: 'pointer',
        background: active ? activeColor : 'transparent',
        color: active ? '#fff' : 'var(--text-muted)',
        fontSize: 13, fontWeight: 600,
        boxShadow: active ? `0 2px 12px ${activeColor}55` : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function IntelligenceMapPage() {
  // ── Filter state ──────────────────────────────────────────────────────
  const [filters, setFiltersState] = useState({
    city: '', disease: [], gender: '', severity: '', timeRange: '1y',
  });
  const setFilter = useCallback((key, value) => {
    setFiltersState(prev => ({ ...prev, [key]: value }));
  }, []);
  const resetFilters = useCallback(() => {
    setFiltersState({ city: '', disease: [], gender: '', severity: '', timeRange: '1y' });
  }, []);

  // ── UI state ──────────────────────────────────────────────────────────
  const [mapMode,        setMapMode]        = useState('bubble');
  const [hiddenDiseases, setHiddenDiseases] = useState(new Set());
  const [isFullscreen,   setIsFullscreen]   = useState(false);
  const pageRef = useRef(null);

  // ── Data state ────────────────────────────────────────────────────────
  const [rows,    setRows]    = useState([]);
  const [kpis,    setKpis]    = useState({});
  const [cities,  setCities]  = useState([]);
  const [diseases,setDiseases]= useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const abortRef   = useRef(null);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Load dropdowns once ───────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getCityList(), getDiseaseList()]).then(([cRes, dRes]) => {
      if (!mountedRef.current) return;
      if (cRes?.data) setCities(cRes.data);
      if (dRes?.data) setDiseases(dRes.data);
    }).catch(() => {});
  }, []);

  // ── Fetch map data on filter change ──────────────────────────────────
  const diseaseDep = Array.isArray(filters.disease) ? filters.disease.join(',') : '';

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
      getDashboardBubble(apiFilters),
      getDashboardKpis(apiFilters),
    ])
      .then(([bubbleRes, kpiRes]) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        setRows(normalizeRows(bubbleRes?.data));
        setKpis(normalizeKpis(kpiRes));
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

  // ── Derived data ──────────────────────────────────────────────────────
  const diseaseNames = useMemo(() => [...new Set(rows.map(r => r.disease_name))].sort(), [rows]);
  const diseaseColorMap = useMemo(
    () => Object.fromEntries(diseaseNames.map((n, i) => [n, getDiseaseColor(n, i)])),
    [diseaseNames]
  );

  const heatPoints = useMemo(() => {
    const maxCases = Math.max(...rows.map(r => r.total_cases), 1);
    return rows.map(r => {
      const gov = normalizeGovName(r.city);
      const coords = GOVERNORATE_COORDS[gov];
      if (!coords) return null;
      return [coords[0], coords[1], r.total_cases / maxCases];
    }).filter(Boolean);
  }, [rows]);

  const toggleDisease = useCallback(name => {
    setHiddenDiseases(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }, []);

  // ── Fullscreen ────────────────────────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      pageRef.current?.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div
      ref={pageRef}
      style={{
        display: 'flex', flexDirection: 'column',
        height: 'calc(100vh - 32px)',
        background: 'var(--bg-primary)',
        borderRadius: 16,
        // overflow must NOT be 'hidden' here — that would clip fixed-position
        // portal dropdowns by creating a containing block for them.
        overflow: 'visible',
        border: '1px solid var(--border)',
        // Fullscreen mode: fill the entire screen
        ...(isFullscreen ? { height: '100vh', borderRadius: 0, border: 'none' } : {}),
      }}
    >
      {/* Fullscreen compatibility styles */}
      <style>{`
        :fullscreen #intelligence-map-root,
        :-webkit-full-screen #intelligence-map-root { height: 100vh !important; border-radius: 0 !important; }
        :fullscreen > div, :-webkit-full-screen > div { display: flex; flex-direction: column; height: 100%; }
      `}</style>
      {/* ── Top Toolbar ───────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}>
        {/* Back button */}
        <Link
          href="/dashboard"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: 13, color: 'var(--text-muted)',
            textDecoration: 'none', fontWeight: 500,
            padding: '5px 10px', borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--bg-primary)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <ArrowLeft size={14} />
          Dashboard
        </Link>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(59,130,246,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={18} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Disease Intelligence Map
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {loading ? 'Loading data…' : `${rows.length} clusters · ${diseaseNames.length} diseases`}
            </div>
          </div>
        </div>

        {/* Live indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 11, color: 'var(--text-muted)',
          background: 'var(--bg-primary)', border: '1px solid var(--border)',
          borderRadius: 8, padding: '4px 10px', marginLeft: 'auto',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: loading ? '#f59e0b' : '#22c55e', display: 'inline-block', boxShadow: `0 0 5px ${loading ? '#f59e0b' : '#22c55e'}` }} />
          {loading ? 'Updating…' : 'Live Data'}
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex', gap: 2,
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
          borderRadius: 24, padding: 3,
        }}>
          <ModeButton active={mapMode === 'bubble'} onClick={() => setMapMode('bubble')} icon={Circle} label="Bubble" activeColor="#3b82f6" />
          <ModeButton active={mapMode === 'heat'}   onClick={() => setMapMode('heat')}   icon={Flame}  label="Heat"   activeColor="#ef4444" />
        </div>

        {/* Fullscreen toggle */}
        <button
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 8,
            background: 'var(--bg-primary)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Filter Sidebar */}
        <MapFilterPanel
          filters={filters}
          setFilter={setFilter}
          resetFilters={resetFilters}
          cities={cities}
          diseases={diseases}
          stats={kpis}
          dataLoading={loading}
        />

        {/* Map area */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          {error ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', flexDirection: 'column', gap: 12,
              color: '#ef4444', fontSize: 14,
            }}>
              <span style={{ fontSize: 40 }}>⚠️</span>
              <span>Failed to load map data</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{error}</span>
            </div>
          ) : (
            <IntelligenceMapView
              rows={rows}
              heatPoints={heatPoints}
              diseaseColorMap={diseaseColorMap}
              hiddenDiseases={hiddenDiseases}
              mode={mapMode}
            />
          )}

          {/* Legend overlay */}
          {mapMode === 'bubble' && !error && (
            <div style={{ position: 'absolute', bottom: 0, right: 0, zIndex: 800, pointerEvents: 'all' }}>
              <MapLegend
                diseaseNames={diseaseNames}
                colorMap={diseaseColorMap}
                hiddenDiseases={hiddenDiseases}
                onToggle={toggleDisease}
                rows={rows}
              />
            </div>
          )}

          {/* No data overlay */}
          {!loading && !error && rows.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 12,
              background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
            }}>
              <span style={{ fontSize: 56 }}>🗺️</span>
              <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>No outbreak clusters for these filters</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Try adjusting time range or removing filters</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
