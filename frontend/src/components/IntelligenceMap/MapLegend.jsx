'use client';
/**
 * MapLegend — Disease legend overlay panel, rendered on top of the Leaflet map.
 * Toggle individual diseases on/off. Shows case count summaries.
 */

import React, { useState } from 'react';

export default function MapLegend({ diseaseNames, colorMap, hiddenDiseases, onToggle, rows }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!diseaseNames?.length) return null;

  // Aggregate total cases per disease
  const casesPerDisease = {};
  (rows || []).forEach(r => {
    casesPerDisease[r.disease_name] = (casesPerDisease[r.disease_name] || 0) + r.total_cases;
  });
  const sorted = [...diseaseNames].sort((a, b) => (casesPerDisease[b] || 0) - (casesPerDisease[a] || 0));

  return (
    <div style={{
      position: 'absolute',
      bottom: 32,
      right: 16,
      zIndex: 1000,
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      padding: collapsed ? '10px 14px' : '14px 16px',
      boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
      backdropFilter: 'blur(12px)',
      minWidth: collapsed ? 'auto' : 200,
      maxWidth: 260,
      maxHeight: collapsed ? 'auto' : 360,
      overflowY: 'auto',
      transition: 'all 0.25s ease',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, marginBottom: collapsed ? 0 : 10, cursor: 'pointer',
        }}
        onClick={() => setCollapsed(v => !v)}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          🦠 Diseases
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{collapsed ? '▲' : '▼'}</span>
      </div>

      {!collapsed && sorted.map(name => {
        const hidden = hiddenDiseases.has(name);
        const color  = colorMap[name] ?? '#64748b';
        const cases  = casesPerDisease[name] || 0;
        const display = cases >= 1000 ? `${(cases / 1000).toFixed(1)}k` : cases.toString();

        return (
          <button
            key={name}
            onClick={() => onToggle(name)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', marginBottom: 6, padding: '5px 8px',
              background: hidden ? 'transparent' : `${color}12`,
              border: `1px solid ${hidden ? 'var(--border)' : `${color}44`}`,
              borderRadius: 8, cursor: 'pointer', outline: 'none',
              opacity: hidden ? 0.45 : 1, transition: 'all 0.18s ease',
              textAlign: 'left',
            }}
          >
            <span style={{
              width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
              background: hidden ? 'var(--text-muted)' : color,
              boxShadow: hidden ? 'none' : `0 0 6px ${color}88`,
            }} />
            <span style={{
              fontSize: 11, color: 'var(--text-secondary)', flex: 1,
              textDecoration: hidden ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{name}</span>
            <span style={{
              fontSize: 10, color: hidden ? 'var(--text-muted)' : color,
              fontWeight: 700, flexShrink: 0,
            }}>{display}</span>
          </button>
        );
      })}

      {!collapsed && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'center' }}>
          Click to toggle visibility
        </div>
      )}
    </div>
  );
}
