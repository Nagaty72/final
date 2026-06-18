'use client';
/**
 * BubbleChart — Egypt Disease Intelligence Map (SSR-safe wrapper)
 *
 * Provides:
 *   • Heat mode  — original leaflet.heat visualization
 *   • Bubble mode — CircleMarker per (governorate × disease) on the SAME real map
 *   • Heat | Bubble toggle button (glassmorphism design)
 *   • Interactive disease legend (bubble mode only)
 *   • Click bubble → filter dashboard to that governorate
 *
 * Data layer (unchanged from stable architecture):
 *   • getDashboardBubble RPC → bubble/heat rows
 *   • Zustand useDashboardFilterStore with useShallow
 *   • AbortController + mountedRef for leak-free cleanup
 *   • useMemo for all derived data
 *
 * Leaflet is dynamically imported (ssr: false) — Leaflet requires browser APIs.
 */
import React, {
  useEffect, useState, useRef, useMemo, useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow }              from 'zustand/react/shallow';
import { getDashboardBubble }      from '@/services/analytics.service';
import { getDiseaseColor }         from '@/lib/chartTheme';

// ── Dynamic SSR-safe import — mirrors original MapWrapper pattern ──────────────
const EgyptMapLeaflet = dynamic(
  () => import('./EgyptMapLeaflet'),
  {
    ssr:     false,
    loading: () => <MapSkeleton />,
  }
);



// ── Governorate coordinates (mirrored from EgyptMapLeaflet for heatPoints) ────
const GOVERNORATE_COORDS = {
  'Cairo': [30.0444, 31.2357], 'Giza': [29.9870, 31.2118],
  'Qalyubia': [30.3292, 31.2168], 'Alexandria': [31.2001, 29.9187],
  'Beheira': [30.8480, 30.3436], 'Gharbia': [30.8754, 31.0334],
  'Kafr el-Sheikh': [31.1107, 30.9388], 'Dakahlia': [31.0364, 31.3807],
  'Sharqia': [30.7341, 31.7227], 'Menofia': [30.5965, 30.9876],
  'Damietta': [31.4165, 31.8133], 'Port Said': [31.2653, 32.3019],
  'Ismailia': [30.5965, 32.2715], 'Suez': [29.9668, 32.5498],
  'North Sinai': [30.2832, 33.6116], 'South Sinai': [28.2084, 33.8657],
  'Fayoum': [29.3084, 30.8428], 'Beni Suef': [29.0661, 31.0994],
  'Minya': [28.0871, 30.7618], 'Assiut': [27.1809, 31.1837],
  'Sohag': [26.5569, 31.6948], 'Qena': [26.1551, 32.7160],
  'Luxor': [25.6872, 32.6396], 'Aswan': [24.0889, 32.8998],
  'Matrouh': [31.3525, 27.2373], 'New Valley': [25.4429, 29.3150],
  'Red Sea': [25.7661, 34.1673],
};

const GOV_ALIASES = {
  'cairo': 'Cairo', 'al qahirah': 'Cairo', 'القاهرة': 'Cairo',
  'giza': 'Giza', 'al jizah': 'Giza', 'الجيزة': 'Giza',
  'alexandria': 'Alexandria', 'al iskandariyah': 'Alexandria', 'الإسكندرية': 'Alexandria',
  'qalyubia': 'Qalyubia', 'al qalyubiyah': 'Qalyubia', 'القليوبية': 'Qalyubia',
  'port said': 'Port Said', "bur sa'id": 'Port Said', 'بورسعيد': 'Port Said',
  'suez': 'Suez', 'as suways': 'Suez', 'السويس': 'Suez',
  'dakahlia': 'Dakahlia', 'ad daqahliyah': 'Dakahlia', 'الدقهلية': 'Dakahlia',
  'red sea': 'Red Sea', 'al bahr al ahmar': 'Red Sea', 'البحر الأحمر': 'Red Sea',
  'beheira': 'Beheira', 'al buhayrah': 'Beheira', 'البحيرة': 'Beheira',
  'ismailia': 'Ismailia', "al isma'iliyah": 'Ismailia', 'الإسماعيلية': 'Ismailia',
  'menofia': 'Menofia', 'al minufiyah': 'Menofia', 'المنوفية': 'Menofia',
  'gharbia': 'Gharbia', 'al gharbiyah': 'Gharbia', 'الغربية': 'Gharbia',
  'kafr el-sheikh': 'Kafr el-Sheikh', 'kafr el sheikh': 'Kafr el-Sheikh',
  'kafr ash shaykh': 'Kafr el-Sheikh', 'كفر الشيخ': 'Kafr el-Sheikh',
  'matrouh': 'Matrouh', 'matruh': 'Matrouh', 'مطروح': 'Matrouh',
  'north sinai': 'North Sinai', 'shamal sina': 'North Sinai', 'شمال سيناء': 'North Sinai',
  'south sinai': 'South Sinai', 'janub sina': 'South Sinai', 'جنوب سيناء': 'South Sinai',
  'damietta': 'Damietta', 'dumyat': 'Damietta', 'دمياط': 'Damietta',
  'sharqia': 'Sharqia', 'ash sharqiyah': 'Sharqia', 'الشرقية': 'Sharqia',
  'luxor': 'Luxor', 'al uqsur': 'Luxor', 'الأقصر': 'Luxor',
  'qena': 'Qena', 'qina': 'Qena', 'قنا': 'Qena',
  'sohag': 'Sohag', 'suhaj': 'Sohag', 'سوهاج': 'Sohag',
  'assiut': 'Assiut', 'asyut': 'Assiut', 'أسيوط': 'Assiut',
  'new valley': 'New Valley', 'al wadi al jadid': 'New Valley', 'الوادي الجديد': 'New Valley',
  'minya': 'Minya', 'al minya': 'Minya', 'المنيا': 'Minya',
  'beni suef': 'Beni Suef', 'bani suwayf': 'Beni Suef', 'بني سويف': 'Beni Suef',
  'fayoum': 'Fayoum', 'al fayum': 'Fayoum', 'الفيوم': 'Fayoum',
  'aswan': 'Aswan', 'أسوان': 'Aswan',
};

function normalizeGovName(city) {
  if (!city) return '';
  const key = city.toLowerCase().replace(/[_']/g, ' ').replace(/\s+/g, ' ').trim();
  return GOV_ALIASES[key] ?? city;
}

// ── Normalize raw RPC response ────────────────────────────────────────────────
function normalizeRows(responseData) {
  let raw = [];
  if (Array.isArray(responseData))                               raw = responseData;
  else if (responseData?.data && Array.isArray(responseData.data)) raw = responseData.data;
  return raw
    .map((r) => ({
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
    }))
    .filter((r) => r.total_cases > 0);
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function MapSkeleton() {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--text-muted)', flexDirection: 'column' }}>
      <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)', animation: 'spin 0.9s linear infinite' }} />
      <span style={{ fontSize: 13 }}>Loading map…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── Toggle button ──────────────────────────────────────────────────────────────
function ModeToggle({ mode, onChange }) {
  const btnBase = {
    padding:      '5px 14px',
    fontSize:      12,
    fontWeight:    600,
    borderRadius:  20,
    cursor:        'pointer',
    border:        'none',
    transition:    'all 0.18s ease',
    outline:       'none',
    letterSpacing: '0.02em',
  };
  const active   = { background: 'var(--accent)', color: '#fff', boxShadow: '0 2px 12px rgba(59,130,246,0.4)' };
  const inactive = { background: 'transparent', color: 'var(--text-muted)' };

  return (
    <div style={{
      display:        'flex',
      gap:             2,
      background:     'var(--bg-primary)',
      border:         '1px solid var(--border)',
      borderRadius:    24,
      padding:         3,
      backdropFilter: 'blur(8px)',
    }}>
      <button style={{ ...btnBase, ...(mode === 'heat'   ? active : inactive) }} onClick={() => onChange('heat')}>
        🔥 Heat
      </button>
      <button style={{ ...btnBase, ...(mode === 'bubble' ? active : inactive) }} onClick={() => onChange('bubble')}>
        🫧 Bubble
      </button>
    </div>
  );
}

// ── Interactive disease legend (bubble mode) ───────────────────────────────────
function DiseaseLegend({ diseaseNames, colorMap, hiddenDiseases, onToggle }) {
  if (!diseaseNames.length) return null;
  return (
    <div
      role="group"
      aria-label="Disease visibility filter"
      style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, flexShrink: 0 }}
    >
      {diseaseNames.map((name, i) => {
        const hidden = hiddenDiseases.has(name);
        const color  = colorMap[name] ?? '#64748b';
        return (
          <button
            key={`bubble-legend-${name}-${i}`}
            onClick={() => onToggle(name)}
            aria-pressed={!hidden}
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:             5,
              fontSize:        11,
              color:           hidden ? 'var(--text-muted)' : 'var(--text-secondary)',
              background:      hidden ? 'transparent' : `${color}18`,
              border:         `1px solid ${hidden ? 'var(--border)' : color}`,
              borderRadius:    20,
              padding:        '3px 10px',
              cursor:         'pointer',
              outline:        'none',
              opacity:         hidden ? 0.5 : 1,
              textDecoration:  hidden ? 'line-through' : 'none',
              transition:     'all 0.18s ease',
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: hidden ? 'var(--text-muted)' : color,
              flexShrink: 0, display: 'inline-block',
            }} />
            {name}
          </button>
        );
      })}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function BubbleChart() {
  // ── Filter store ──────────────────────────────────────────────────────────
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

  // ── Local state ───────────────────────────────────────────────────────────
  const [rows,           setRows]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [mapMode,        setMapMode]        = useState('bubble'); // 'heat' | 'bubble'
  const [hiddenDiseases, setHiddenDiseases] = useState(new Set());

  const abortRef   = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Fetch ─────────────────────────────────────────────────────────────────
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
        setRows(normalizeRows(res?.data));
      })
      .catch((err) => {
        if (ctrl.signal.aborted || !mountedRef.current) return;
        setError(err.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted && mountedRef.current) setLoading(false);
      });

    return () => ctrl.abort();
  }, [filters.city, diseaseDep, filters.gender, filters.severity, filters.status, filters.hospital, filters.timeRange]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const diseaseNames    = useMemo(() => [...new Set(rows.map((r) => r.disease_name))].sort(), [rows]);
  const diseaseColorMap = useMemo(
    () => Object.fromEntries(diseaseNames.map((n, i) => [n, getDiseaseColor(n, i)])),
    [diseaseNames]
  );

  // Heat points: [lat, lng, normalised_intensity] for leaflet.heat
  const heatPoints = useMemo(() => {
    const maxCases = Math.max(...rows.map((r) => r.total_cases), 1);
    return rows
      .map((r) => {
        const gov = normalizeGovName(r.city);
        const coords = GOVERNORATE_COORDS[gov];
        if (!coords) return null;
        return [coords[0], coords[1], r.total_cases / maxCases];
      })
      .filter(Boolean);
  }, [rows]);

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const toggleDisease = useCallback((name) => {
    setHiddenDiseases((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  // Click bubble → set city filter in store
  const handleGovClick = useCallback((gov) => {
    useDashboardFilterStore.getState().setFilter('city', gov);
  }, []);

  const hasNoData = !loading && !error && rows.length === 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background:    'var(--bg-secondary)',
      border:        '1px solid var(--border)',
      borderRadius:   16,
      padding:        24,
      height:         '100%',
      display:        'flex',
      flexDirection:  'column',
    }}>
      {/* ── Header row ── */}
      <div style={{
        display:        'flex',
        alignItems:     'flex-start',
        justifyContent: 'space-between',
        marginBottom:    4,
        flexShrink:      0,
        gap:             12,
        flexWrap:       'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'rgba(59,130,246,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: 18 }}>🗺️</span>
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Egypt Disease Intelligence Map
            </h2>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
              {mapMode === 'bubble'
                ? 'Governorate bubbles — click to filter · size = case volume'
                : 'Disease intensity heatmap across Egypt'}
            </p>
          </div>
        </div>

        {/* ── Heat | Bubble toggle ── */}
        <ModeToggle mode={mapMode} onChange={setMapMode} />
      </div>

      {/* ── Disease legend (bubble mode only) ── */}
      {mapMode === 'bubble' && diseaseNames.length > 0 && (
        <DiseaseLegend
          diseaseNames={diseaseNames}
          colorMap={diseaseColorMap}
          hiddenDiseases={hiddenDiseases}
          onToggle={toggleDisease}
        />
      )}

      {/* ── Map area ── */}
      <div style={{ flex: 1, minHeight: 0, marginTop: 12 }}>
        {loading ? (
          <MapSkeleton />
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', fontSize: 13 }}>
            ⚠ {error}
          </div>
        ) : hasNoData ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', gap: 10 }}>
            <span style={{ fontSize: 48 }}>🗺️</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>No outbreak clusters match the current filters.</span>
            <span style={{ fontSize: 12, opacity: 0.6 }}>Adjust time range or remove active filters.</span>
          </div>
        ) : (
          <EgyptMapLeaflet
            rows={rows}
            heatPoints={heatPoints}
            diseaseColorMap={diseaseColorMap}
            hiddenDiseases={hiddenDiseases}
            mode={mapMode}
            onGovClick={handleGovClick}
          />
        )}
      </div>
    </div>
  );
}
