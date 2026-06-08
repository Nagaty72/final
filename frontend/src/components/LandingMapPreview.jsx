'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';

const DARK_TILE = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const LIGHT_TILE = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

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
          if (!gov.lat || !gov.lng) return null;
          const maxCases = Math.max(...(bubbleData.map(d => d.cases) || [1]));
          const ratio = gov.cases / (maxCases || 1);
          const size = 6 + (ratio * 12); // Between 6px and 18px

          const color = gov.cases > 10000 ? '#EF4444' : gov.cases > 5000 ? '#F59E0B' : '#10B981';
          const riskLevel = gov.cases > 10000 ? 'High Risk' : gov.cases > 5000 ? 'Medium Risk' : 'Low Risk';

          return (
            <CircleMarker
              key={idx}
              center={[gov.lat, gov.lng]}
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
                  <div className="font-mono text-[11px] font-bold" style={{ color }}>{Number(gov.cases).toLocaleString()} cases</div>
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
