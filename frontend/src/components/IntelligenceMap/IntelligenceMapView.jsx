'use client';
/**
 * IntelligenceMapView — Core Leaflet map for the Disease Intelligence Map page.
 *
 * Features:
 *  • Free-roam world map (no maxBounds lock) — user can zoom anywhere
 *  • Egypt centered at launch (zoom 6)
 *  • CartoDB dark/light tiles — theme-aware
 *  • Bubble mode: CircleMarker per (governorate × disease)
 *  • Heat mode: leaflet.heat layer
 *  • Fullscreen API support
 *  • "Fly to Egypt" custom control
 *  • React 19 + Next.js 16 SSR-safe (parent must dynamic-import with ssr:false)
 */

import { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  useMap,
  ZoomControl,
} from 'react-leaflet';
import L from 'leaflet';
import { useTheme } from 'next-themes';

// ── Leaflet.heat bootstrap ──────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.L = L;
  require('leaflet.heat');
}

// ── Map constants ───────────────────────────────────────────────────────────
const EGYPT_CENTER  = [26.8206, 30.8025];
const DEFAULT_ZOOM  = 6;
const DARK_TILE_URL  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ── Real governorate centre coordinates ────────────────────────────────────
export const GOVERNORATE_COORDS = {
  'Cairo':          [30.0444, 31.2357],
  'Giza':           [29.9870, 31.2118],
  'Qalyubia':       [30.3292, 31.2168],
  'Alexandria':     [31.2001, 29.9187],
  'Beheira':        [30.8480, 30.3436],
  'Gharbia':        [30.8754, 31.0334],
  'Kafr el-Sheikh': [31.1107, 30.9388],
  'Dakahlia':       [31.0364, 31.3807],
  'Sharqia':        [30.7341, 31.7227],
  'Menofia':        [30.5965, 30.9876],
  'Damietta':       [31.4165, 31.8133],
  'Port Said':      [31.2653, 32.3019],
  'Ismailia':       [30.5965, 32.2715],
  'Suez':           [29.9668, 32.5498],
  'North Sinai':    [30.2832, 33.6116],
  'South Sinai':    [28.2084, 33.8657],
  'Fayoum':         [29.3084, 30.8428],
  'Beni Suef':      [29.0661, 31.0994],
  'Minya':          [28.0871, 30.7618],
  'Assiut':         [27.1809, 31.1837],
  'Sohag':          [26.5569, 31.6948],
  'Qena':           [26.1551, 32.7160],
  'Luxor':          [25.6872, 32.6396],
  'Aswan':          [24.0889, 32.8998],
  'Matrouh':        [31.3525, 27.2373],
  'New Valley':     [25.4429, 29.3150],
  'Red Sea':        [25.7661, 34.1673],
};

// ── Name normalisation ──────────────────────────────────────────────────────
const GOV_ALIASES = {
  'cairo': 'Cairo', 'al qahirah': 'Cairo', 'al-qahirah': 'Cairo', 'القاهرة': 'Cairo',
  'giza': 'Giza', 'al jizah': 'Giza', 'الجيزة': 'Giza', 'gizeh': 'Giza',
  'qalyubia': 'Qalyubia', 'al qalyubiyah': 'Qalyubia', 'القليوبية': 'Qalyubia',
  'alexandria': 'Alexandria', 'al iskandariyah': 'Alexandria', 'الإسكندرية': 'Alexandria', 'alex': 'Alexandria',
  'beheira': 'Beheira', 'al buhayrah': 'Beheira', 'البحيرة': 'Beheira',
  'gharbia': 'Gharbia', 'al gharbiyah': 'Gharbia', 'الغربية': 'Gharbia',
  'kafr el-sheikh': 'Kafr el-Sheikh', 'kafr el sheikh': 'Kafr el-Sheikh', 'كفر الشيخ': 'Kafr el-Sheikh',
  'dakahlia': 'Dakahlia', 'ad daqahliyah': 'Dakahlia', 'الدقهلية': 'Dakahlia',
  'sharqia': 'Sharqia', 'ash sharqiyah': 'Sharqia', 'الشرقية': 'Sharqia',
  'menofia': 'Menofia', 'al minufiyah': 'Menofia', 'المنوفية': 'Menofia',
  'damietta': 'Damietta', 'dumyat': 'Damietta', 'دمياط': 'Damietta',
  'port said': 'Port Said', "bur sa'id": 'Port Said', 'بورسعيد': 'Port Said',
  'ismailia': 'Ismailia', "al isma'iliyah": 'Ismailia', 'الإسماعيلية': 'Ismailia',
  'suez': 'Suez', 'as suways': 'Suez', 'السويس': 'Suez',
  'north sinai': 'North Sinai', 'shamal sina': 'North Sinai', 'شمال سيناء': 'North Sinai',
  'south sinai': 'South Sinai', 'janub sina': 'South Sinai', 'جنوب سيناء': 'South Sinai',
  'fayoum': 'Fayoum', 'al fayum': 'Fayoum', 'الفيوم': 'Fayoum',
  'beni suef': 'Beni Suef', 'bani suwayf': 'Beni Suef', 'بني سويف': 'Beni Suef',
  'minya': 'Minya', 'al minya': 'Minya', 'المنيا': 'Minya',
  'assiut': 'Assiut', 'asyut': 'Assiut', 'أسيوط': 'Assiut',
  'sohag': 'Sohag', 'suhaj': 'Sohag', 'سوهاج': 'Sohag',
  'qena': 'Qena', 'qina': 'Qena', 'قنا': 'Qena',
  'luxor': 'Luxor', 'al uqsur': 'Luxor', 'الأقصر': 'Luxor',
  'aswan': 'Aswan', 'أسوان': 'Aswan',
  'matrouh': 'Matrouh', 'matruh': 'Matrouh', 'مطروح': 'Matrouh',
  'new valley': 'New Valley', 'al wadi al jadid': 'New Valley', 'الوادي الجديد': 'New Valley',
  'red sea': 'Red Sea', 'al bahr al ahmar': 'Red Sea', 'البحر الأحمر': 'Red Sea',
};

export function normalizeGovName(city) {
  if (!city) return '';
  const key = city.toLowerCase().replace(/[_']/g, ' ').replace(/\s+/g, ' ').trim();
  return GOV_ALIASES[key] ?? city;
}

// ── Bubble radius — proportional, never hidden ─────────────────────────────
// Uses square-root scaling so large values don't completely dwarf small ones.
// MIN 5px — always visible on screen. MAX 52px — capped for overlap control.
function bubbleRadius(cases, maxCases) {
  if (!cases || !maxCases) return 5;
  return Math.max(5, Math.min(52, Math.sqrt(cases / maxCases) * 52));
}

// ── Theme-aware tiles ───────────────────────────────────────────────────────
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

// ── Heat layer ──────────────────────────────────────────────────────────────
function HeatLayer({ points }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points?.length) return;
    const layer = L.heatLayer(points, {
      radius: 30, blur: 20, maxZoom: 12,
      gradient: { 0.3: '#3b82f6', 0.5: '#22c55e', 0.7: '#f59e0b', 0.85: '#ef4444', 1.0: '#7c3aed' },
    }).addTo(map);
    return () => { map.removeLayer(layer); };
  }, [map, points]);
  return null;
}

// ── Fly-to-Egypt controller ─────────────────────────────────────────────────
function FlyToEgyptControl({ isDark }) {
  const map = useMap();
  const handleFly = useCallback(() => {
    map.flyTo(EGYPT_CENTER, DEFAULT_ZOOM, { animate: true, duration: 1.2 });
  }, [map]);

  useEffect(() => {
    const ControlClass = L.Control.extend({
      onAdd() {
        const btn = L.DomUtil.create('button', '');
        btn.innerHTML = '🇪🇬';
        btn.title = 'Fly to Egypt';
        Object.assign(btn.style, {
          width: '34px', height: '34px', background: isDark ? '#1e293b' : '#fff',
          border: `1px solid ${isDark ? '#334155' : '#ccc'}`, borderRadius: '4px',
          cursor: 'pointer', fontSize: '16px', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 1px 5px rgba(0,0,0,.4)',
        });
        L.DomEvent.on(btn, 'click', L.DomEvent.stopPropagation);
        L.DomEvent.on(btn, 'click', handleFly);
        return btn;
      },
    });
    const ctrl = new ControlClass({ position: 'topleft' });
    ctrl.addTo(map);
    return () => { ctrl.remove(); };
  }, [map, handleFly, isDark]);

  return null;
}

// ── Main map component ──────────────────────────────────────────────────────
export default function IntelligenceMapView({
  rows,            // normalizedRow[]
  heatPoints,      // [lat, lng, intensity][]
  diseaseColorMap, // Record<name, hex>
  hiddenDiseases,  // Set<name>
  mode,            // 'bubble' | 'heat'
  mapRef,          // ref forwarded from parent for fullscreen
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const bubbles = useMemo(() => {
    if (mode !== 'bubble') return [];
    const maxCases = Math.max(...rows.map(r => r.total_cases), 1);

    const groups = {};
    rows.forEach(r => {
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
        let dLat = 0, dLng = 0;
        if (n > 1) {
          const angle  = (idx / n) * 2 * Math.PI - Math.PI / 2;
          const offDeg = Math.min(0.28, 0.45 / Math.sqrt(n));
          dLat = Math.cos(angle) * offDeg;
          dLng = Math.sin(angle) * offDeg * 1.3;
        }
        const radiusScale = n >= 3 ? Math.max(0.55, 1 / Math.sqrt(n * 0.7)) : 1;
        result.push({
          ...r,
          canonicalGov: gov,
          position: [baseLat + dLat, baseLng + dLng],
          radius: bubbleRadius(r.total_cases, maxCases) * radiusScale,
          color: diseaseColorMap[r.disease_name] ?? '#64748b',
        });
      });
    });

    // No slice — ALL governorates with matching data are rendered.
    return result;
  }, [rows, hiddenDiseases, diseaseColorMap, mode]);

  const popupBg     = isDark ? 'rgba(15,23,42,0.97)'  : 'rgba(255,255,255,0.98)';
  const popupBorder = isDark ? 'rgba(51,65,85,0.8)'   : 'rgba(226,232,240,0.9)';
  const popupText   = isDark ? '#f8fafc'               : '#0f172a';
  const popupMuted  = isDark ? '#94a3b8'               : '#64748b';

  return (
    <div ref={mapRef} style={{ height: '100%', width: '100%' }}>
      <MapContainer
        center={EGYPT_CENTER}
        zoom={DEFAULT_ZOOM}
        minZoom={2}
        zoomControl={false}
        scrollWheelZoom
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <ThemeAwareTiles />
        <ZoomControl position="topleft" />
        <FlyToEgyptControl isDark={isDark} />

        {mode === 'heat' && heatPoints?.length > 0 && (
          <HeatLayer points={heatPoints} />
        )}

        {mode === 'bubble' && bubbles.map((b, i) => (
          <CircleMarker
            key={`ib-${i}`}
            center={b.position}
            radius={b.radius}
            pathOptions={{
              fillColor:   b.color,
              color:       b.color,
              weight:      2.5,
              fillOpacity: 0.70,
              opacity:     1,
            }}
          >
            <Tooltip sticky direction="top" offset={[0, -4]}>
              <div style={{ fontFamily: 'inherit', minWidth: 210 }}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  marginBottom: 8, paddingBottom: 8,
                  borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                }}>
                  <span style={{
                    width: 11, height: 11, borderRadius: '50%',
                    background: b.color, flexShrink: 0,
                    boxShadow: `0 0 8px ${b.color}88`,
                    display: 'inline-block',
                  }} />
                  <span style={{ fontWeight: 700, fontSize: 14, color: popupText }}>
                    {b.canonicalGov}
                  </span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 600,
                    background: `${b.color}22`, color: b.color,
                    padding: '2px 7px', borderRadius: 10,
                    border: `1px solid ${b.color}44`,
                  }}>
                    {b.disease_name}
                  </span>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 12 }}>
                  <div style={{ color: popupMuted }}>📊 Total Cases</div>
                  <div style={{ color: '#3b82f6', fontWeight: 700 }}>{b.total_cases.toLocaleString()}</div>
                  <div style={{ color: popupMuted }}>🏥 Hospitals</div>
                  <div style={{ color: '#22c55e', fontWeight: 700 }}>{b.hospital_count}</div>
                  <div style={{ color: popupMuted }}>⚡ Load/Hospital</div>
                  <div style={{ color: '#f59e0b', fontWeight: 700 }}>{Number(b.load_index || 0).toFixed(0)}</div>
                </div>

                {/* Severity */}
                <div style={{
                  marginTop: 8, paddingTop: 8,
                  borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                  fontSize: 11,
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 6px',
                }}>
                  <span style={{ color: '#22c55e' }}>Mild: <b>{b.mild}</b></span>
                  <span style={{ color: '#f59e0b' }}>Moderate: <b>{b.moderate}</b></span>
                  <span style={{ color: '#ef4444' }}>Severe: <b>{b.severe}</b></span>
                  <span style={{ color: '#7c3aed' }}>Critical: <b>{b.critical}</b></span>
                  <span style={{ color: '#dc2626' }}>Extreme: <b>{b.extreme}</b></span>
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      <style>{`
        .leaflet-tooltip {
          background: ${popupBg} !important;
          border: 1px solid ${popupBorder} !important;
          border-radius: 14px !important;
          box-shadow: 0 12px 40px rgba(0,0,0,${isDark ? '0.6' : '0.18'}) !important;
          padding: 12px 16px !important;
          font-size: 12px !important;
          pointer-events: none !important;
          max-width: 280px !important;
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
          background: ${isDark ? 'rgba(15,23,42,0.75)' : 'rgba(255,255,255,0.85)'} !important;
          color: ${isDark ? '#475569' : '#9ca3af'} !important;
          font-size: 10px !important;
        }
        .leaflet-bar { border-color: ${isDark ? '#334155' : '#d1d5db'} !important; }
      `}</style>
    </div>
  );
}
