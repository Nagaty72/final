'use client';

import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';

// Fix Leaflet's default icon path issues in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons
const createCustomIcon = (color) => {
  return new L.DivIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color}80;"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

const hospitalIcon = createCustomIcon('#3b82f6');
const clinicIcon = createCustomIcon('#10b981');
const userIcon = new L.DivIcon({
  className: 'user-marker',
  html: `<div style="background-color: #ef4444; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px #ef4444;"></div><div class="pulse-ring"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to dynamically center map
function MapController({ center, zoom, activeHospitalId }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom || map.getZoom(), { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

// Component to dynamically switch tile layer on theme change
function ThemeAwareTiles() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const lightUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <TileLayer
      key={isDark ? 'dark' : 'light'}
      url={isDark ? darkUrl : lightUrl}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    />
  );
}

export default function MapComponent({ hospitals, userLocation, activeHospitalId, onMarkerClick }) {
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = resolvedTheme === 'dark';

  // Default to Cairo, Egypt
  const defaultCenter = [30.0444, 31.2357];
  
  // Calculate center based on priorities: Active Hospital > User Location > Default
  const getCenter = () => {
    if (activeHospitalId) {
      const active = hospitals.find(h => h.id === activeHospitalId);
      if (active && active.latitude && active.longitude) {
        return [active.latitude, active.longitude];
      }
    }
    if (userLocation) {
      return [userLocation.latitude, userLocation.longitude];
    }
    return defaultCenter;
  };

  const center = getCenter();

  const popupBg = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)';
  const popupBorder = isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(226, 232, 240, 0.8)';
  const popupTextPrimary = isDark ? '#f8fafc' : '#0f172a';
  const popupTextSecondary = isDark ? '#94a3b8' : '#64748b';

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <MapContainer 
        center={center} 
        zoom={userLocation ? 13 : 11} 
        style={{ height: '100%', width: '100%', background: isDark ? '#0f172a' : '#f8fafc' }}
        zoomControl={false}
      >
        <ThemeAwareTiles />
        
        <MapController center={center} zoom={activeHospitalId ? 15 : (userLocation ? 13 : 11)} activeHospitalId={activeHospitalId} />

        {/* User Location Marker */}
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
            <Popup className="themed-popup">
              <div style={{ padding: '4px' }}>
                <strong style={{ color: '#ef4444' }}>{t('hospitals.your_location')}</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Hospital Markers */}
        {hospitals.filter(h => h.latitude && h.longitude).map((hospital) => {
          const isClinic = hospital.type?.toLowerCase().includes('clinic');
          const isActive = hospital.id === activeHospitalId;
          
          // Make active marker slightly larger/different
          const icon = isActive ? new L.DivIcon({
            className: 'custom-marker-active',
            html: `<div style="background-color: ${isClinic ? '#10b981' : '#3b82f6'}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 15px ${isClinic ? '#10b981' : '#3b82f6'};"></div>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13],
          }) : (isClinic ? clinicIcon : hospitalIcon);

          return (
            <Marker 
              key={hospital.id} 
              position={[hospital.latitude, hospital.longitude]} 
              icon={icon}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(hospital.id)
              }}
            >
              <Popup className="themed-popup">
                <div style={{ padding: '8px', minWidth: '180px' }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', color: popupTextPrimary }}>{hospital.name}</h3>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: popupTextSecondary }}>
                    {hospital.type || t('hospitals.hospital')} • {hospital.district_name || hospital.city}
                  </p>
                  {hospital.distance !== undefined && (
                    <p style={{ margin: '0', fontSize: '13px', color: '#3b82f6', fontWeight: 'bold' }}>
                      {(hospital.distance / 1000).toFixed(2)} {t('hospitals.km_away')}
                    </p>
                  )}
                  {hospital.emergency_available && (
                    <span style={{ display: 'inline-block', marginTop: '8px', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '11px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {t('hospitals.emergency_247')}
                    </span>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      <style>{`
        .themed-popup .leaflet-popup-content-wrapper {
          background: ${popupBg};
          backdrop-filter: blur(8px);
          border: 1px solid ${popupBorder};
          color: ${popupTextPrimary};
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,${isDark ? '0.5' : '0.15'});
        }
        .themed-popup .leaflet-popup-tip {
          background: ${popupBg};
          border: 1px solid ${popupBorder};
        }
        .pulse-ring {
          position: absolute;
          top: -9px;
          left: -9px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 2px solid rgba(239, 68, 68, 0.5);
          animation: map-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes map-pulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(2); opacity: 0; }
        }
        /* Fix RTL leaflet controls */
        html[dir="rtl"] .leaflet-control {
          direction: ltr;
        }
      `}</style>
    </div>
  );
}
