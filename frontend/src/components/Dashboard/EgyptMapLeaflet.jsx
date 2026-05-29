'use client';
/**
 * EgyptMapLeaflet — Real Egypt map (restored from original HeatmapComponent)
 * with Disease Bubble overlay layer.
 *
 * Map foundation: identical to original HeatmapComponent
 *   • Center:  [26.8206, 30.8025] (Egypt geographic center)
 *   • Bounds:  [[21.5, 24.5], [32.0, 37.0]]
 *   • Tiles:   CartoDB light_all (light) / dark_all (dark) — theme-aware
 *   • Zoom:    min 5, default 6
 *
 * Added on top:
 *   • Bubble mode — CircleMarker per (governorate × disease) at real lat/lng
 *   • Heat mode   — standard leaflet.heat layer (original behavior)
 *   • Toggle button: Heat | Bubble
 *
 * Stability:
 *   mountedRef, AbortController (in parent), no render loops,
 *   useMemo for derived data, stable event handlers, React 19 safe.
 *
 * TODO: Materialised view — pre-aggregate bubble clusters server-side for O(1) response
 * TODO: GIS heat layer depth — add intensity ramp parameter from live severity data
 * TODO: WebSocket streaming — real-time bubble radius pulse on new case ingestion
 * TODO: Choropleth fill — shade governorate polygons by case-count quintile
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';
import { getDiseaseColor, HEAT_GRADIENT } from '@/lib/chartTheme';

// ── Heat layer bootstrap (mirrors original HeatmapComponent exactly) ──────────
if (typeof window !== 'undefined') {
  window.L = L;
  require('leaflet.heat');
}

// ── Map constants (identical to original HeatmapComponent) ────────────────────
const EGYPT_CENTER  = [26.8206, 30.8025];
const EGYPT_BOUNDS  = [[21.5, 24.5], [32.0, 37.0]];
const DEFAULT_ZOOM  = 6;
const MIN_ZOOM      = 5;
const DARK_TILE_URL  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ── Real governorate centre coordinates [lat, lng] ────────────────────────────
// Hard-coded from real geographic data — governorate administrative centroids.
// These are the same type of coordinates that power WHO/CDC outbreak maps.
const GOVERNORATE_COORDS = {
  // Greater Cairo Region
  'Cairo':         [30.0444, 31.2357],
  'Giza':          [29.9870, 31.2118],
  'Qalyubia':      [30.3292, 31.2168],
  // Nile Delta
  'Alexandria':    [31.2001, 29.9187],
  'Beheira':       [30.8480, 30.3436],
  'Gharbia':       [30.8754, 31.0334],
  'Kafr el-Sheikh':[31.1107, 30.9388],
  'Dakahlia':      [31.0364, 31.3807],
  'Sharqia':       [30.7341, 31.7227],
  'Menofia':       [30.5965, 30.9876],
  'Damietta':      [31.4165, 31.8133],
  // Canal Zone
  'Port Said':     [31.2653, 32.3019],
  'Ismailia':      [30.5965, 32.2715],
  'Suez':          [29.9668, 32.5498],
  // Sinai
  'North Sinai':   [30.2832, 33.6116],
  'South Sinai':   [28.2084, 33.8657],
  // Upper Egypt
  'Fayoum':        [29.3084, 30.8428],
  'Beni Suef':     [29.0661, 31.0994],
  'Minya':         [28.0871, 30.7618],
  'Assiut':        [27.1809, 31.1837],
  'Sohag':         [26.5569, 31.6948],
  'Qena':          [26.1551, 32.7160],
  'Luxor':         [25.6872, 32.6396],
  'Aswan':         [24.0889, 32.8998],
  // Western Desert / Red Sea
  'Matrouh':       [31.3525, 27.2373],
  'New Valley':    [25.4429, 29.3150],
  'Red Sea':       [25.7661, 34.1673],
};

// ── Name normalisation (DB city → canonical key in GOVERNORATE_COORDS) ────────
const GOV_ALIASES = {
  // Cairo
  'cairo':         'Cairo',   'al qahirah': 'Cairo',  'al-qahirah':  'Cairo',
  'القاهرة':       'Cairo',   'el cairo':   'Cairo',  'al qahira':   'Cairo',
  // Alexandria
  'alexandria':           'Alexandria', 'al iskandariyah': 'Alexandria',
  'الإسكندرية':           'Alexandria', 'alex':            'Alexandria',
  'al iskandariya':       'Alexandria', 'el iskandariyya': 'Alexandria',
  // Giza
  'giza':    'Giza', 'al jizah':  'Giza', 'al-jizah': 'Giza',
  'الجيزة':  'Giza', 'gizeh':    'Giza', 'el giza':  'Giza',
  // Qalyubia
  'qalyubia':    'Qalyubia', 'al qalyubiyah': 'Qalyubia',
  'qalyubiyya':  'Qalyubia', 'القليوبية':     'Qalyubia',
  // Port Said
  'port said':  'Port Said', "bur sa'id":  'Port Said',
  'بورسعيد':    'Port Said', 'port saïd':  'Port Said', 'bur sa id': 'Port Said',
  // Suez
  'suez': 'Suez', 'as suways': 'Suez', 'السويس': 'Suez', 'el suez': 'Suez',
  // Dakahlia
  'dakahlia':    'Dakahlia', 'ad daqahliyah': 'Dakahlia',
  'الدقهلية':    'Dakahlia', 'el dakahlia':   'Dakahlia',
  // Red Sea
  'red sea':           'Red Sea', 'al bahr al ahmar': 'Red Sea',
  'البحر الأحمر':      'Red Sea', 'bahr ahmar':       'Red Sea',
  // Beheira
  'beheira': 'Beheira', 'al buhayrah': 'Beheira',
  'البحيرة': 'Beheira', 'el beheira':  'Beheira',
  // Ismailia
  'ismailia':       'Ismailia', "al isma'iliyah": 'Ismailia',
  'الإسماعيلية':   'Ismailia', 'el ismailia':     'Ismailia',
  'ismaïlia':       'Ismailia', 'al ismailia':     'Ismailia',
  // Menofia
  'menofia':    'Menofia', 'al minufiyah': 'Menofia',
  'المنوفية':   'Menofia', 'menoufiya':    'Menofia', 'el menofia': 'Menofia',
  // Gharbia
  'gharbia':    'Gharbia', 'al gharbiyah': 'Gharbia',
  'الغربية':    'Gharbia', 'el gharbia':   'Gharbia',
  // Kafr el-Sheikh
  'kafr el-sheikh':  'Kafr el-Sheikh', 'kafr el sheikh':  'Kafr el-Sheikh',
  'kafr elsheikh':   'Kafr el-Sheikh', 'kafr ash shaykh': 'Kafr el-Sheikh',
  'كفر الشيخ':       'Kafr el-Sheikh', 'kafr el-shaykh':  'Kafr el-Sheikh',
  // Matrouh
  'matrouh':     'Matrouh', 'matruh':       'Matrouh',
  'al matruh':   'Matrouh', 'مطروح':       'Matrouh', 'marsa matruh': 'Matrouh',
  // North Sinai
  'north sinai':  'North Sinai', 'shamal sina':   'North Sinai',
  'شمال سيناء':   'North Sinai', "shamal sina'":  'North Sinai',
  'shamal sinai': 'North Sinai',
  // South Sinai
  'south sinai':  'South Sinai', 'janub sina':    'South Sinai',
  'جنوب سيناء':   'South Sinai', "janub sina'":   'South Sinai',
  'janub sinai':  'South Sinai',
  // Damietta
  'damietta': 'Damietta', 'dumyat': 'Damietta', 'دمياط': 'Damietta',
  // Sharqia
  'sharqia':    'Sharqia', 'ash sharqiyah': 'Sharqia',
  'الشرقية':    'Sharqia', 'el sharqia':    'Sharqia', 'el sharkia': 'Sharqia',
  // Luxor
  'luxor': 'Luxor', 'al uqsur': 'Luxor', 'الأقصر': 'Luxor',
  // Qena
  'qena': 'Qena', 'qina': 'Qena', 'kena': 'Qena', 'قنا': 'Qena',
  // Sohag
  'sohag': 'Sohag', 'suhaj': 'Sohag', 'سوهاج': 'Sohag', 'sohaj': 'Sohag',
  // Assiut
  'assiut': 'Assiut', 'asyut': 'Assiut', 'أسيوط': 'Assiut',
  'asyout': 'Assiut', 'assuit': 'Assiut',
  // New Valley
  'new valley':       'New Valley', 'al wadi al jadid': 'New Valley',
  'الوادي الجديد':    'New Valley', 'el wadi el gadid': 'New Valley',
  'wadi al jadid':    'New Valley',
  // Minya
  'minya': 'Minya', 'el minya': 'Minya', 'al minya': 'Minya',
  'المنيا': 'Minya', 'minia': 'Minya',
  // Beni Suef
  'beni suef':   'Beni Suef', 'beni-suef':   'Beni Suef',
  'bani suwayf': 'Beni Suef', 'بني سويف':   'Beni Suef',
  // Fayoum
  'fayoum':  'Fayoum', 'al fayum':  'Fayoum',
  'الفيوم':  'Fayoum', 'el fayoum': 'Fayoum', 'faiyum': 'Fayoum',
  // Aswan
  'aswan': 'Aswan', 'أسوان': 'Aswan', 'assouan': 'Aswan',
};

function normalizeGovName(city) {
  if (!city) return '';
  const key = city.toLowerCase().replace(/[_']/g, ' ').replace(/\s+/g, ' ').trim();
  return GOV_ALIASES[key] ?? city;
}


// ── Bubble radius (px, fixed regardless of zoom) ──────────────────────────────
function bubbleRadius(cases, maxCases) {
  if (!cases || !maxCases) return 8;
  return Math.max(8, Math.min(42, Math.sqrt(cases / maxCases) * 42));
}

// ── Theme-aware tile layer (from original MapComponent) ───────────────────────
function ThemeAwareTiles() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  return (
    <TileLayer
      key={isDark ? 'dark' : 'light'}
      url={isDark ? DARK_TILE_URL : LIGHT_TILE_URL}
      attribution={TILE_ATTR}
      maxZoom={20}
      subdomains="abcd"
    />
  );
}

// ── Heat layer inner component (mirrors original HeatmapComponent logic) ──────
function HeatLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points || points.length === 0) return;
    const layer = L.heatLayer(points, {
      radius:  25,
      blur:    18,
      maxZoom: 10,
      gradient: HEAT_GRADIENT,
    }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, points]);
  return null;
}

// ── Main exported component ───────────────────────────────────────────────────
export default function EgyptMapLeaflet({
  rows,            // NormalizedRow[] from parent BubbleChart
  heatPoints,      // [lat, lng, intensity][] for heat mode
  diseaseColorMap, // Record<diseaseName, hexColor>
  hiddenDiseases,  // Set<diseaseName>
  mode,            // 'bubble' | 'heat'
  onGovClick,      // (canonicalGovName) => void
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // ── Build bubble list ─────────────────────────────────────────────────────
  const bubbles = useMemo(() => {
    if (mode !== 'bubble') return [];
    const maxCases = Math.max(...rows.map((r) => r.total_cases), 1);

    // Group by canonical governorate
    const groups = {};
    rows.forEach((r) => {
      if (hiddenDiseases.has(r.disease_name)) return;
      const gov = normalizeGovName(r.city);
      if (!GOVERNORATE_COORDS[gov]) return;
      if (!groups[gov]) groups[gov] = [];
      groups[gov].push(r);
    });

    const result = [];
    Object.entries(groups).forEach(([gov, govRows]) => {
      const [baseLat, baseLng] = GOVERNORATE_COORDS[gov];
      const n = govRows.length;

      govRows.forEach((r, idx) => {
        // Radial geographic offset so diseases don't perfectly stack
        let dLat = 0, dLng = 0;
        if (n > 1) {
          const angle  = (idx / n) * 2 * Math.PI - Math.PI / 2;
          const offDeg = Math.min(0.30, 0.50 / Math.sqrt(n));
          dLat = Math.cos(angle) * offDeg;
          dLng = Math.sin(angle) * offDeg * 1.25;
        }

        const radiusScale = n >= 3 ? Math.max(0.55, 1 / Math.sqrt(n * 0.7)) : 1;

        result.push({
          ...r,
          canonicalGov: gov,
          position:     [baseLat + dLat, baseLng + dLng],
          radius:       bubbleRadius(r.total_cases, maxCases) * radiusScale,
          color:        diseaseColorMap[r.disease_name] ?? '#64748b',
        });
      });
    });

    // Cap at 50 visible bubbles for performance
    return result.slice(0, 50);
  }, [rows, hiddenDiseases, diseaseColorMap, mode]);

  const popupBg     = isDark ? 'rgba(15,23,42,0.95)'  : 'rgba(255,255,255,0.97)';
  const popupBorder = isDark ? 'rgba(51,65,85,0.8)'   : 'rgba(226,232,240,0.9)';
  const popupText   = isDark ? '#f8fafc'               : '#0f172a';
  const popupMuted  = isDark ? '#94a3b8'               : '#64748b';

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer
        center={EGYPT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={MIN_ZOOM}
        maxBounds={EGYPT_BOUNDS}
        maxBoundsViscosity={1.0}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', borderRadius: 12, zIndex: 0 }}
      >
        {/* ── Tile layer — same as original MapComponent, theme-aware ── */}
        <ThemeAwareTiles />

        {/* ── Heat layer — mirrors original HeatmapComponent exactly ── */}
        {mode === 'heat' && heatPoints && heatPoints.length > 0 && (
          <HeatLayer points={heatPoints} />
        )}

        {/* ── Bubble layer — CircleMarkers at real governorate coordinates ── */}
        {mode === 'bubble' && bubbles.map((b, i) => (
          <CircleMarker
            key={`bbl-${i}`}
            center={b.position}
            radius={b.radius}
            pathOptions={{
              fillColor:   b.color,
              color:       b.color,
              weight:      2,
              fillOpacity: 0.72,
              opacity:     1,
            }}
            eventHandlers={{
              click: () => {
                if (typeof onGovClick === 'function') onGovClick(b.canonicalGov);
              },
            }}
          >
            <Tooltip sticky direction="top" offset={[0, -4]}>
              <div style={{
                fontFamily: 'inherit',
                minWidth:   200,
              }}>
                {/* Governorate + disease header */}
                <div style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:           6,
                  marginBottom:  7,
                  paddingBottom: 7,
                  borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: b.color, flexShrink: 0, display: 'inline-block',
                    boxShadow: `0 0 6px ${b.color}`,
                  }} />
                  <span style={{ fontWeight: 700, fontSize: 13, color: popupText }}>
                    {b.canonicalGov}
                  </span>
                </div>

                {/* Disease info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: popupMuted }}>
                  <div>🦠 <strong style={{ color: popupText }}>{b.disease_name}</strong></div>
                  <div>📊 Cases: <strong style={{ color: '#3b82f6' }}>{b.total_cases.toLocaleString()}</strong></div>
                  <div>🏥 Hospitals: <strong style={{ color: '#22c55e' }}>{b.hospital_count}</strong></div>
                  <div>⚡ Load: <strong style={{ color: '#f59e0b' }}>{Number(b.load_index || 0).toFixed(1)}/hospital</strong></div>
                  {/* Severity distribution */}
                  <div style={{
                    marginTop:  5,
                    paddingTop: 5,
                    borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '2px 8px',
                    fontSize: 11,
                  }}>
                    <span style={{ color: '#22c55e' }}>Mild: {b.mild}</span>
                    <span style={{ color: '#f59e0b' }}>Moderate: {b.moderate}</span>
                    <span style={{ color: '#ef4444' }}>Severe: {b.severe}</span>
                    <span style={{ color: '#7c3aed' }}>Critical: {b.critical}</span>
                    <span style={{ color: '#dc2626' }}>Extreme: {b.extreme}</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 10, color: isDark ? '#475569' : '#94a3b8', fontStyle: 'italic' }}>
                    Click to filter dashboard to {b.canonicalGov}
                  </div>
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* ── Popup theme override (mirrors original MapComponent style block) ── */}
      <style>{`
        .leaflet-tooltip {
          background: ${popupBg} !important;
          border: 1px solid ${popupBorder} !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 30px rgba(0,0,0,${isDark ? '0.5' : '0.15'}) !important;
          padding: 10px 14px !important;
          font-size: 12px !important;
          pointer-events: none !important;
          max-width: 260px !important;
          color: ${isDark ? '#94a3b8' : '#475569'} !important;
        }
        .leaflet-tooltip-top::before  { border-top-color:    ${popupBorder} !important; }
        .leaflet-tooltip-bottom::before { border-bottom-color: ${popupBorder} !important; }
        .leaflet-control-zoom a {
          background: ${isDark ? '#1e293b' : '#ffffff'} !important;
          color: ${isDark ? '#94a3b8' : '#374151'} !important;
          border-color: ${isDark ? '#334155' : '#d1d5db'} !important;
        }
        .leaflet-control-zoom a:hover {
          background: ${isDark ? '#334155' : '#f3f4f6'} !important;
          color: ${isDark ? '#f1f5f9' : '#111827'} !important;
        }
        .leaflet-control-attribution {
          background: ${isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.8)'} !important;
          color: ${isDark ? '#475569' : '#9ca3af'} !important;
          font-size: 10px !important;
        }
        .leaflet-control-attribution a {
          color: ${isDark ? '#64748b' : '#6b7280'} !important;
        }
        html[dir="rtl"] .leaflet-control { direction: ltr; }
      `}</style>
    </div>
  );
}
