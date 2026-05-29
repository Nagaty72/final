'use client';
/**
 * MapFilterPanel — Self-contained filter sidebar for the Intelligence Map page.
 *
 * Renders disease, city, gender, severity, and time range filters.
 * All dropdowns use React Portal for z-index safety.
 *
 * ── Dropdown Positioning System ─────────────────────────────────────────────
 *  • SMART DIRECTION: if not enough space below the trigger the dropdown opens
 *    upward instead of downward.
 *  • FULLSCREEN AWARE: portals render inside the active fullscreen element
 *    (document.fullscreenElement) instead of always into document.body.
 *    This keeps dropdowns visible when the map is fullscreened.
 *  • NO CLIPPING: the aside uses overflow: visible so portals are unaffected;
 *    the scrollable inner area is handled by a dedicated scroll container.
 *
 * Props:
 *   filters      — { city, disease[], gender, severity, timeRange }
 *   setFilter    — (key, value) => void
 *   resetFilters — () => void
 *   cities       — string[]
 *   diseases     — { value: string, label: string }[]
 *   stats        — { total_cases, active_cases, total_patients, total_hospitals }
 *   dataLoading  — boolean
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, RotateCcw, ChevronDown, Check } from 'lucide-react';

const TIME_RANGES = [
  { value: '',     label: 'All Time'       },
  { value: 'today','label': 'Today'         },
  { value: '7d',   label: 'Last 7 Days'    },
  { value: '30d',  label: 'Last 30 Days'   },
  { value: '6m',   label: 'Last 6 Months'  },
  { value: '1y',   label: 'Last Year'      },
  { value: '3y',   label: 'Last 3 Years'   },
];
const GENDERS = [
  { value: '',       label: 'All Genders' },
  { value: 'male',   label: 'Male'        },
  { value: 'female', label: 'Female'      },
];
const SEVERITIES = [
  { value: '', label: 'All Severities' },
  { value: '1', label: 'Mild'     },
  { value: '2', label: 'Moderate' },
  { value: '3', label: 'Severe'   },
  { value: '4', label: 'Critical' },
  { value: '5', label: 'Extreme'  },
];

// ── Dropdown portal root ─────────────────────────────────────────────────────
// In fullscreen mode the portal must render INSIDE the fullscreen element,
// otherwise the browser clips it outside the fullscreen viewport.
function getPortalRoot() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.body;
}

// ── Compute smart dropdown position ─────────────────────────────────────────
// Returns { top, bottom, left, width, openUpward } using fixed coordinates.
// "openUpward" is true when there is not enough space below the trigger.
const DROPDOWN_MARGIN = 4;  // px gap between trigger and dropdown
const DROPDOWN_MAX_H  = 260; // px – mirrors maxHeight in the dropdown style

function computeDropdownCoords(triggerEl, maxHeight = DROPDOWN_MAX_H) {
  const rect       = triggerEl.getBoundingClientRect();
  const vpHeight   = window.innerHeight;
  const spaceBelow = vpHeight - rect.bottom;
  const spaceAbove = rect.top;

  const openUpward = spaceBelow < maxHeight + DROPDOWN_MARGIN && spaceAbove > spaceBelow;

  // In fullscreen the fixed viewport IS the fullscreen element, so fixed
  // positioning works the same way.  We still use the element's client rect.
  return {
    left:       rect.left,
    width:      rect.width,
    openUpward,
    // downward anchor
    top:        rect.bottom + DROPDOWN_MARGIN,
    // upward anchor — position bottom of dropdown at top of trigger
    bottomAnchor: vpHeight - rect.top + DROPDOWN_MARGIN,
  };
}

// ── Shared dropdown styles ───────────────────────────────────────────────────
function dropdownStyle({ coords, minWidth = 240 }) {
  const base = {
    position:    'fixed',
    left:        coords.left,
    width:       Math.max(coords.width, minWidth),
    zIndex:      2147483647,           // max safe z-index, beats fullscreen chrome
    background:  'var(--bg-secondary)',
    border:      '1px solid var(--border)',
    borderRadius: 10,
    boxShadow:   '0 8px 32px rgba(0,0,0,0.30)',
    maxHeight:   DROPDOWN_MAX_H,
    overflowY:   'auto',
    padding:     '4px 0',
  };

  if (coords.openUpward) {
    return { ...base, bottom: coords.bottomAnchor, top: 'auto' };
  }
  return { ...base, top: coords.top, bottom: 'auto' };
}

// ── Portal-safe MultiSelect ─────────────────────────────────────────────────
function PortalMultiSelect({ label, selectedValues, onChange, options }) {
  const [isOpen,  setIsOpen]  = useState(false);
  const [coords,  setCoords]  = useState(null);
  const triggerRef            = useRef(null);
  const dropdownRef           = useRef(null);

  const openDropdown = useCallback(() => {
    if (triggerRef.current) {
      setCoords(computeDropdownCoords(triggerRef.current));
    }
    setIsOpen(true);
  }, []);

  // Recalculate on scroll / resize while open
  useEffect(() => {
    if (!isOpen) return;
    const recalc = () => {
      if (triggerRef.current) setCoords(computeDropdownCoords(triggerRef.current));
    };
    window.addEventListener('scroll',  recalc, true);
    window.addEventListener('resize',  recalc);
    return () => {
      window.removeEventListener('scroll',  recalc, true);
      window.removeEventListener('resize',  recalc);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e) {
      if (
        triggerRef.current  && !triggerRef.current.contains(e.target)  &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  const toggle = (val) => {
    if (!val) { onChange([]); setIsOpen(false); return; }
    onChange(selectedValues.includes(val)
      ? selectedValues.filter(v => v !== val)
      : [...selectedValues, val]);
  };

  const displayText = selectedValues.length === 0
    ? 'All Diseases'
    : selectedValues.length === 1 ? selectedValues[0] : `${selectedValues.length} selected`;

  const portalRoot = getPortalRoot();
  const dropdownEl = (isOpen && coords && portalRoot) ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle({ coords })}
    >
      {options.map((o, idx) => {
        const isSel = selectedValues.includes(o.value);
        return (
          <div
            key={`${o.value}-${idx}`}
            onClick={() => toggle(o.value)}
            style={{
              padding: '8px 12px', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              background: isSel ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: isSel ? 'var(--text-primary)' : 'var(--text-secondary)',
              userSelect: 'none',
            }}
            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-primary)'; }}
            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1px solid ${isSel ? '#3b82f6' : 'var(--border)'}`,
              background: isSel ? '#3b82f6' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isSel && <Check size={10} color="white" />}
            </div>
            {o.label}
          </div>
        );
      })}
    </div>,
    portalRoot
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <div
        ref={triggerRef}
        onClick={isOpen ? () => setIsOpen(false) : openDropdown}
        style={{
          width: '100%', padding: '8px 32px 8px 10px',
          background: 'var(--bg-primary)',
          border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8, fontSize: 13, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          color: selectedValues.length ? 'var(--text-primary)' : 'var(--text-muted)',
          transition: 'border-color 0.2s', position: 'relative',
          boxSizing: 'border-box',
          userSelect: 'none',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {displayText}
        </span>
        <ChevronDown size={14} style={{
          position: 'absolute', right: 10, top: '50%',
          transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
          color: 'var(--text-muted)', transition: 'transform 0.2s',
          pointerEvents: 'none',
        }} />
      </div>
      {dropdownEl}
    </div>
  );
}

// ── Portal-safe Single Select ────────────────────────────────────────────────
function FilterSelect({ label, value, onChange, options }) {
  const [isOpen,  setIsOpen]  = useState(false);
  const [coords,  setCoords]  = useState(null);
  const triggerRef            = useRef(null);
  const dropdownRef           = useRef(null);

  const openDropdown = useCallback(() => {
    if (triggerRef.current) {
      setCoords(computeDropdownCoords(triggerRef.current, 200));
    }
    setIsOpen(true);
  }, []);

  // Recalculate on scroll / resize while open
  useEffect(() => {
    if (!isOpen) return;
    const recalc = () => {
      if (triggerRef.current) setCoords(computeDropdownCoords(triggerRef.current, 200));
    };
    window.addEventListener('scroll',  recalc, true);
    window.addEventListener('resize',  recalc);
    return () => {
      window.removeEventListener('scroll',  recalc, true);
      window.removeEventListener('resize',  recalc);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e) {
      if (
        triggerRef.current  && !triggerRef.current.contains(e.target)  &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];
  const displayText    = selectedOption ? selectedOption.label : 'Select…';

  const portalRoot = getPortalRoot();
  const dropdownPortal = (isOpen && coords && portalRoot) ? createPortal(
    <div
      ref={dropdownRef}
      style={dropdownStyle({ coords, minWidth: 240 })}
    >
      {options.map((o, idx) => {
        const isSel = String(o.value) === String(value);
        return (
          <div
            key={`${o.value}-${idx}`}
            onClick={() => { onChange(o.value); setIsOpen(false); }}
            style={{
              padding: '8px 12px',
              fontSize: 13,
              cursor: 'pointer',
              background: isSel ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: isSel ? 'var(--accent)' : 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              userSelect: 'none',
            }}
            onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--bg-primary)'; }}
            onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
          >
            {o.label}
          </div>
        );
      })}
    </div>,
    portalRoot
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div
          ref={triggerRef}
          onClick={isOpen ? () => setIsOpen(false) : openDropdown}
          style={{
            width: '100%',
            padding: '8px 28px 8px 10px',
            background: 'var(--bg-primary)',
            border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8,
            color: value ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 13,
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            userSelect: 'none',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayText}
          </span>
        </div>
        <ChevronDown
          size={13}
          style={{
            position: 'absolute',
            right: 9,
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            transition: 'transform 0.2s',
          }}
        />
      </div>
      {dropdownPortal}
    </div>
  );
}

// ── Stat mini-card ──────────────────────────────────────────────────────────
function StatMini({ label, value, color }) {
  const num = Number(value ?? 0);
  const display = num >= 1_000_000
    ? `${(num / 1_000_000).toFixed(1)}M`
    : num >= 1000 ? `${(num / 1000).toFixed(1)}k` : num.toLocaleString();
  return (
    <div style={{
      background: 'var(--bg-primary)', border: `1px solid ${color}33`,
      borderRadius: 10, padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.03em' }}>{display}</div>
    </div>
  );
}

// ── Main export ─────────────────────────────────────────────────────────────
export default function MapFilterPanel({
  filters, setFilter, resetFilters,
  cities = [], diseases = [],
  stats = {},
  dataLoading = false,
}) {
  const activeCount = useMemo(() => [
    filters.city,
    ...(filters.disease || []),
    filters.gender,
    filters.severity,
    filters.timeRange && filters.timeRange !== '1y' ? filters.timeRange : null,
  ].filter(Boolean).length, [filters]);

  const cityOptions = useMemo(() => {
    const unique = Array.from(new Map(cities.map(c => [c, c])).values());
    return [
      { value: '', label: 'All Governorates' },
      ...unique.map(c => ({ value: c, label: c })),
    ];
  }, [cities]);

  const diseaseOptions = useMemo(() => {
    const unique = Array.from(new Map(diseases.map(d => [d.name ?? d, d])).values());
    return [
      { value: '', label: 'All Diseases' },
      ...unique.map(d => ({ value: d.name ?? d, label: d.name ?? d })),
    ];
  }, [diseases]);

  return (
    /*
     * The aside itself does NOT clip its children (overflow: visible on the
     * outer shell) so portals positioned fixed never get scissored by it.
     * The inner scrollable area handles actual content overflow.
     */
    <aside style={{
      width: 280, flexShrink: 0,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      // overflow: visible — portals must not be clipped by the sidebar
      overflow: 'visible',
      // but we need the sidebar itself scrollable, so use a child for that:
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Scrollable inner wrapper */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto', overflowX: 'visible',
        height: '100%',
        // Prevent stacking context creation via transform/filter that would
        // trap fixed-position children inside this element.
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 12px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'rgba(59,130,246,0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <SlidersHorizontal size={16} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Map Filters</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Filter disease data</div>
            </div>
            {activeCount > 0 && (
              <span style={{
                marginLeft: 'auto',
                background: '#3b82f6', color: 'white',
                fontSize: 10, fontWeight: 700,
                padding: '2px 7px', borderRadius: 10,
              }}>{activeCount} Active</span>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--border), transparent)', margin: '0 16px', flexShrink: 0 }} />

        {/* Stats */}
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
            Live Summary
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 4 }}>
            <StatMini label="Total Cases"   value={stats.total_cases}     color="#3b82f6" />
            <StatMini label="Active Cases"  value={stats.active_cases}    color="#f59e0b" />
            <StatMini label="Patients"      value={stats.total_patients}  color="#a855f7" />
            <StatMini label="Hospitals"     value={stats.total_hospitals} color="#22c55e" />
          </div>
          {dataLoading && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: '4px 0' }}>
              ⟳ Updating…
            </div>
          )}
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '16px 20px 0', flexShrink: 0 }} />

        {/* Filters */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
          <PortalMultiSelect
            label="Disease"
            selectedValues={filters.disease || []}
            onChange={v => setFilter('disease', v)}
            options={diseaseOptions}
          />
          <FilterSelect label="Governorate" value={filters.city || ''}      onChange={v => setFilter('city',      v)} options={cityOptions}  />
          <FilterSelect label="Gender"      value={filters.gender || ''}    onChange={v => setFilter('gender',    v)} options={GENDERS}      />
          <FilterSelect label="Severity"    value={filters.severity || ''}  onChange={v => setFilter('severity',  v)} options={SEVERITIES}   />
          <FilterSelect label="Time Range"  value={filters.timeRange || ''} onChange={v => setFilter('timeRange', v)} options={TIME_RANGES}  />
        </div>

        {/* Reset */}
        <div style={{ padding: '0 20px 20px', flexShrink: 0 }}>
          <button
            onClick={resetFilters}
            disabled={activeCount === 0}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '9px 0', borderRadius: 8, border: `1px solid ${activeCount ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
              background: activeCount ? 'rgba(239,68,68,0.08)' : 'transparent',
              color: activeCount ? '#ef4444' : 'var(--text-muted)',
              fontSize: 13, fontWeight: 600, cursor: activeCount ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { if (activeCount) { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff'; } }}
            onMouseLeave={e => { if (activeCount) { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; } }}
          >
            <RotateCcw size={14} />
            Clear All Filters
          </button>
        </div>
      </div>
    </aside>
  );
}
