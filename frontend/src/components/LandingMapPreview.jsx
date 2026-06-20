'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

// Fallback coordinates for known Egyptian governorates.
// Used when the API response does not include lat/lng fields.
const CITY_COORDS = {
  'Cairo':           [30.0444, 31.2357],
  'Cairo Governorate': [30.0444, 31.2357],
  'Alexandria':      [31.2001, 29.9187],
  'Alexandria Governorate': [31.2001, 29.9187],
  'Giza':            [30.0131, 31.2089],
  'Giza Governorate': [30.0131, 31.2089],
  'Dakahlia':        [31.0364, 31.3807],
  'Dakahlia Governorate': [31.0364, 31.3807],
  'Aswan':           [24.0889, 32.8998],
  'Aswan Governorate': [24.0889, 32.8998],
  'Luxor':           [25.6872, 32.6396],
  'Luxor Governorate': [25.6872, 32.6396],
  'Qena':            [26.1551, 32.7160],
  'Sohag':           [26.5569, 31.6948],
  'Asyut':           [27.1833, 31.1667],
  'Minya':           [28.0871, 30.7618],
  'Beni Suef':       [29.0744, 31.0990],
  'Fayyum':          [29.3084, 30.8428],
  'Sharqia':         [30.7369, 31.7165],
  'Gharbia':         [30.8758, 31.0334],
  'Kafr el-Sheikh':  [31.1107, 30.9388],
  'Monufia':         [30.5972, 30.9876],
  'Qalyubia':        [30.3292, 31.2168],
  'Beheira':         [30.8480, 30.3436],
  'Ismailia':        [30.5965, 32.2715],
  'Port Said':       [31.2565, 32.2841],
  'Suez':            [29.9737, 32.5263],
  'North Sinai':     [30.2841, 33.6272],
  'South Sinai':     [28.2500, 33.8333],
  'Matruh':          [31.3543, 27.2373],
  'New Valley':      [25.4333, 30.5500],
  'Red Sea':         [27.2574, 33.8129],
};

export default function LandingMapPreview({ bubbleData }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Fix default leaflet icons just in case
    delete L.Icon.Default.prototype._getIconUrl;
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === 'dark';

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[26.8206, 30.8025]}
        zoom={5.5}
        scrollWheelZoom={true}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%', background: isDark ? '#0f172a' : '#f8fafc' }}
      >
        <TileLayer
          key={isDark ? 'dark' : 'light'}
          url={isDark ? DARK_TILE : LIGHT_TILE}
        />
        
        {bubbleData?.map((gov, idx) => {
          // Resolve lat/lng: use explicit fields first, fall back to CITY_COORDS lookup.
          let rawLat = gov.lat ?? gov.latitude;
          let rawLng = gov.lng ?? gov.longitude;

          if (!Number.isFinite(Number(rawLat)) || !Number.isFinite(Number(rawLng))) {
            // Try the city name lookup table
            const cityKey = gov.city || gov.district_name || gov.city_name || '';
            const lookup = CITY_COORDS[cityKey] || CITY_COORDS[cityKey.replace(' Governorate', '')];
            if (lookup) {
              console.log('[LandingMapPreview] lat/lng missing — resolved via CITY_COORDS for:', cityKey);
              [rawLat, rawLng] = lookup;
            } else {
              console.error('[LandingMapPreview] no coordinates found — skipping entry:', JSON.stringify(gov));
              return null;
            }
          }

          const safeLat = Number(rawLat);
          const safeLng = Number(rawLng);

          // Normalise case count — API may use cases, case_count, or total_cases
          const rawCases = gov.cases ?? gov.case_count ?? gov.total_cases ?? 0;
          const govCases = Number.isFinite(Number(rawCases)) ? Number(rawCases) : 0;

          const allCaseCounts = (bubbleData || []).map(d => {
            const v = d.cases ?? d.case_count ?? d.total_cases ?? 0;
            return Number.isFinite(Number(v)) ? Number(v) : 0;
          });
          const maxCases = Math.max(...allCaseCounts, 1); // always ≥ 1

          const ratio   = govCases / maxCases;
          const rawSize = 6 + (ratio * 12); // Between 6px and 18px
          const size    = Number.isFinite(rawSize) ? rawSize : 6;

          if (!Number.isFinite(rawSize)) {
            console.error('[LandingMapPreview] non-finite radius — govCases:', govCases, 'maxCases:', maxCases, 'gov:', JSON.stringify(gov));
          }

          const color     = govCases > 10000 ? '#EF4444' : govCases > 5000 ? '#F59E0B' : '#10B981';
          const riskLevel = govCases > 10000 ? 'High Risk' : govCases > 5000 ? 'Medium Risk' : 'Low Risk';

          return (
            <CircleMarker
              key={idx}
              center={[safeLat, safeLng]}
              radius={size}
              pathOptions={{
                fillColor: color,
                color: color,
                weight: 2,
                fillOpacity: 0.6,
                opacity: 0.9
              }}
            >
              <Tooltip sticky direction="top" className={isDark ? 'dark-tooltip' : 'light-tooltip'}>
                <div className="font-sans px-1 py-0.5">
                  <div className="font-bold text-[13px] mb-1">{gov.city?.replace(' Governorate', '')}</div>
                  <div className="font-mono text-[11px] font-bold" style={{ color }}>{govCases.toLocaleString()} cases</div>
                  <div className="text-[9px] uppercase tracking-wider mt-1 text-slate-500 font-bold">
                    {riskLevel}
                  </div>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <style>{`
        .leaflet-container { background: transparent !important; }
        .dark-tooltip {
          background: rgba(15,23,42,0.95) !important;
          border: 1px solid rgba(51,65,85,0.8) !important;
          color: #f8fafc !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.6) !important;
        }
        .light-tooltip {
          background: rgba(255,255,255,0.95) !important;
          border: 1px solid rgba(226,232,240,0.8) !important;
          color: #0f172a !important;
          border-radius: 8px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        }
        .dark-tooltip::before { border-top-color: rgba(51,65,85,0.8) !important; }
        .light-tooltip::before { border-top-color: rgba(226,232,240,0.8) !important; }
      `}</style>
    </div>
  );
}
