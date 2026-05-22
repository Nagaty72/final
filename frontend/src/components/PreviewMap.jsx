'use client';
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// ── Suppress default icon ─────────────────────────────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;

// ── Color palette ─────────────────────────────────────────────────────────────
const COLORS = ['#ef4444', '#f59e0b', '#a855f7', '#3b82f6', '#10b981'];

// ── Severity labels derived from rank ─────────────────────────────────────────
const SEVERITY = ['Critical', 'High', 'Elevated', 'Moderate', 'Tracked'];

// ── Glowing pulsing marker icon (no label baked in) ──────────────────────────
const createGlowIcon = (colorHex, rank) =>
  L.divIcon({
    className: '',
    html: `
      <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;cursor:pointer;">
        <div style="
          position:absolute;inset:0;border-radius:50%;
          background:${colorHex}28;
          animation:epicPing 2s cubic-bezier(0,0,0.2,1) infinite;
        "></div>
        <div style="
          position:absolute;width:22px;height:22px;border-radius:50%;
          background:${colorHex}14;
          border:1.5px solid ${colorHex}55;
          animation:epicPing 2s cubic-bezier(0,0,0.2,1) infinite 0.35s;
        "></div>
        <div style="
          width:13px;height:13px;border-radius:50%;
          background:${colorHex};
          box-shadow:0 0 10px ${colorHex},0 0 22px ${colorHex}70;
          border:1.5px solid rgba(255,255,255,0.65);
          position:relative;z-index:2;
          transition:transform 0.15s ease;
        "></div>
        <div style="
          position:absolute;top:-9px;right:-9px;
          width:15px;height:15px;border-radius:50%;
          background:#0f172a;border:1px solid ${colorHex};
          color:${colorHex};font-size:7.5px;font-weight:800;
          display:flex;align-items:center;justify-content:center;
          font-family:monospace;letter-spacing:0;
        ">${rank}</div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    tooltipAnchor: [18, -8],
  });

// ── Five fixed Egypt positions ────────────────────────────────────────────────
const MAP_POSITIONS = [
  { lat: 30.0444, lng: 31.2357, city: 'Cairo Governorate' },
  { lat: 31.2001, lng: 29.9187, city: 'Alexandria Governorate' },
  { lat: 24.0889, lng: 32.8998, city: 'Aswan Governorate' },
  { lat: 30.5965, lng: 32.2715, city: 'Ismailia Governorate' },
  { lat: 29.3084, lng: 30.8428, city: 'Fayoum Governorate' },
];

export default function PreviewMap({ diseases }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div style={{ width: '100%', height: '100%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 36, height: 36, border: '3px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const center = [26.8206, 30.8025];
  const items = (diseases || []).slice(0, 5);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>

      {/* ── Map ─────────────────────────────────────────────────────────── */}
      <MapContainer
        center={center}
        zoom={5}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer url={tileUrl} />

        {items.map((disease, idx) => {
          const pos = MAP_POSITIONS[idx];
          if (!pos) return null;
          const color = COLORS[idx];
          const cases = Number(disease.cases || 0);
          const pct = disease.percentage ? Number(disease.percentage).toFixed(1) : null;
          const severity = SEVERITY[idx];

          return (
            <Marker
              key={idx}
              position={[pos.lat, pos.lng]}
              icon={createGlowIcon(color, idx + 1)}
            >
              {/* react-leaflet Tooltip — shows on hover, hides on leave */}
              <Tooltip
                direction="top"
                offset={[0, -10]}
                permanent={false}
                sticky={false}
                opacity={1}
                className={`epi-tooltip epi-tooltip-${idx}`}
              >
                {/* Tooltip inner content — styled via injected CSS below */}
                <div className="epi-tt-inner">
                  {/* Header row */}
                  <div className="epi-tt-header">
                    <span className="epi-tt-dot" style={{ background: color, boxShadow: `0 0 7px ${color}` }} />
                    <span className="epi-tt-name">{disease.name}</span>
                    <span className="epi-tt-severity" style={{ color, borderColor: `${color}40`, background: `${color}14` }}>
                      {severity}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="epi-tt-divider" style={{ background: `${color}30` }} />

                  {/* Stats grid */}
                  <div className="epi-tt-grid">
                    <div className="epi-tt-stat">
                      <span className="epi-tt-stat-label">Total Cases</span>
                      <span className="epi-tt-stat-value" style={{ color }}>{cases.toLocaleString()}</span>
                    </div>
                    {pct && (
                      <div className="epi-tt-stat">
                        <span className="epi-tt-stat-label">Share</span>
                        <span className="epi-tt-stat-value" style={{ color }}>{pct}%</span>
                      </div>
                    )}
                  </div>

                  {/* Location */}
                  <div className="epi-tt-location">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span className="epi-tt-city">{pos.city}</span>
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {/* ── Ambient vignette overlay ───────────────────────────────────── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10,
        background: 'linear-gradient(180deg, rgba(15,23,42,0.16) 0%, transparent 28%, transparent 68%, rgba(15,23,42,0.32) 100%)',
      }} />

      {/* ── Live Surveillance badge ───────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 12, left: 12, zIndex: 30,
        background: 'rgba(15,23,42,0.86)',
        backdropFilter: 'blur(14px)',
        border: '1px solid rgba(59,130,246,0.28)',
        borderRadius: 10,
        padding: '5px 11px',
        display: 'flex', alignItems: 'center', gap: 7,
        boxShadow: '0 4px 20px rgba(0,0,0,0.38)',
        pointerEvents: 'none',
      }}>
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#22c55e', boxShadow: '0 0 8px #22c55e',
          display: 'inline-block',
          animation: 'liveGlow 2s ease-in-out infinite',
        }} />
        <span style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
          Live Surveillance
        </span>
      </div>

      {/* ── Compact legend ────────────────────────────────────────────── */}
      {items.length > 0 && (
        <div style={{
          position: 'absolute', bottom: 56, right: 12, zIndex: 30,
          background: 'rgba(15,23,42,0.84)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          padding: '8px 12px',
          minWidth: 138,
          boxShadow: '0 4px 24px rgba(0,0,0,0.42)',
          pointerEvents: 'none',
        }}>
          <div style={{ color: '#475569', fontSize: 8.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 7, fontFamily: 'monospace' }}>
            Top Outbreaks
          </div>
          {items.map((disease, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: idx < items.length - 1 ? 5 : 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[idx], boxShadow: `0 0 5px ${COLORS[idx]}`, flexShrink: 0 }} />
              <span style={{ color: '#cbd5e1', fontSize: 10.5, fontWeight: 600, fontFamily: 'system-ui, sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 104 }}>
                {disease.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Global styles: marker animation + tooltip overrides ───────── */}
      <style>{`
        /* --- Marker animations --- */
        @keyframes epicPing {
          0%   { opacity: 0.9; transform: scale(1); }
          50%  { opacity: 0.4; transform: scale(1.6); }
          100% { opacity: 0.9; transform: scale(1); }
        }
        @keyframes liveGlow {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* --- Strip Leaflet's default tooltip styling completely --- */
        .epi-tooltip.leaflet-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          color: inherit !important;
          white-space: normal !important;
          /* fade + scale animation on show */
          animation: epiTooltipIn 0.18s cubic-bezier(0.16,1,0.3,1) both;
        }
        .epi-tooltip.leaflet-tooltip::before {
          display: none !important;
        }
        @keyframes epiTooltipIn {
          from { opacity: 0; transform: translateY(6px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* --- Inner card --- */
        .epi-tt-inner {
          background: rgba(10, 15, 30, 0.92);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 12px;
          padding: 11px 14px;
          min-width: 186px;
          box-shadow:
            0 8px 32px rgba(0,0,0,0.55),
            0 1px 0 rgba(255,255,255,0.05) inset;
          font-family: system-ui, -apple-system, sans-serif;
        }

        /* --- Header row: dot + name + severity badge --- */
        .epi-tt-header {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 8px;
        }
        .epi-tt-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .epi-tt-name {
          font-size: 13px;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.01em;
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .epi-tt-severity {
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          border: 1px solid;
          border-radius: 5px;
          padding: 2px 6px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        /* --- Divider --- */
        .epi-tt-divider {
          height: 1px;
          margin-bottom: 9px;
        }

        /* --- Stats grid --- */
        .epi-tt-grid {
          display: flex;
          gap: 16px;
          margin-bottom: 9px;
        }
        .epi-tt-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .epi-tt-stat-label {
          font-size: 9px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-family: monospace;
        }
        .epi-tt-stat-value {
          font-size: 15px;
          font-weight: 800;
          font-family: monospace;
          letter-spacing: -0.02em;
        }

        /* --- Location row --- */
        .epi-tt-location {
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .epi-tt-city {
          font-size: 10px;
          font-weight: 600;
          color: #64748b;
          letter-spacing: 0.02em;
        }

        /* --- Keep Leaflet container font clean --- */
        .leaflet-container {
          font-family: system-ui, -apple-system, sans-serif;
        }
      `}</style>
    </div>
  );
}
