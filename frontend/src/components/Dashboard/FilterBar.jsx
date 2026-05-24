'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow } from 'zustand/react/shallow';
import { getDiseaseList, getCityList } from '@/services/analytics.service';
import { useTranslation } from 'react-i18next';
import { SlidersHorizontal, RotateCcw, ChevronDown, Check } from 'lucide-react';

const TIME_RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d',    label: 'Last 7 Days' },
  { value: '30d',   label: 'Last 30 Days' },
  { value: '6m',    label: 'Last 6 Months' },
  { value: '1y',    label: 'Last Year' },
  { value: '3y',    label: 'Last 3 Years' },
];

const GENDERS = [
  { value: '', label: 'All Genders' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];

const SEVERITIES = [
  { value: '', label: 'All Severities' },
  { value: '1', label: 'Mild' },
  { value: '2', label: 'Moderate' },
  { value: '3', label: 'Severe' },
  { value: '4', label: 'Critical' },
  { value: '5', label: 'Extreme' },
];

function FilterSelect({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const selectedOption = options.find(o => String(o.value) === String(value)) || options[0];
  const displayText = selectedOption ? selectedOption.label : 'Select...';

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        width: '100%',
        minWidth: 160,
        zIndex: 99999,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        maxHeight: 200,
        overflowY: 'auto',
        padding: '4px 0',
      }}
    >
      {options.map((o, idx) => {
        const isSel = String(o.value) === String(value);
        return (
          <div
            key={`${o.value}-${idx}`}
            onClick={() => {
              onChange(o.value);
              setIsOpen(false);
            }}
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
    </div>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 130, position: 'relative' }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div
          ref={triggerRef}
          onClick={isOpen ? () => setIsOpen(false) : openDropdown}
          style={{
            width: '100%',
            padding: '8px 32px 8px 12px',
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
          size={14}
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
            color: 'var(--text-muted)',
            pointerEvents: 'none',
            transition: 'transform 0.2s',
          }}
        />
        {dropdownMenu}
      </div>
    </div>
  );
}

function MultiSelect({ label, selectedValues, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef          = useRef(null);
  const dropdownRef         = useRef(null);

  const openDropdown = useCallback(() => {
    setIsOpen(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isOpen]);

  const toggleValue = (val) => {
    if (!val) { onChange([]); setIsOpen(false); return; }
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter(v => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const displayText = selectedValues.length === 0
    ? 'All Diseases'
    : selectedValues.length === 1
      ? selectedValues[0]
      : `${selectedValues.length} selected`;

  const dropdownMenu = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        width: 'max-content',
        minWidth: '100%',
        zIndex: 99999,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        maxHeight: 250,
        overflowY: 'auto',
        padding: '4px 0',
      }}
    >
      {options.map((o, idx) => {
        const isSelected = selectedValues.includes(o.value);
        return (
          <div
            key={`${o.value}-${idx}`}
            onClick={() => o.value ? toggleValue(o.value) : onChange([])}
            style={{
              padding: '8px 12px', fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              background: isSelected ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg-primary)'; }}
            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{
              width: 16, height: 16, borderRadius: 4, flexShrink: 0,
              border: `1px solid ${isSelected ? '#3b82f6' : 'var(--border)'}`,
              background: isSelected ? '#3b82f6' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {isSelected && <Check size={12} color="white" />}
            </div>
            {o.label}
          </div>
        );
      })}
    </div>
  ) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 160, position: 'relative' }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <div
          ref={triggerRef}
          onClick={isOpen ? () => setIsOpen(false) : openDropdown}
          style={{
            width: '100%', padding: '8px 32px 8px 12px',
            background: 'var(--bg-primary)',
            border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8,
            color: selectedValues.length ? 'var(--text-primary)' : 'var(--text-muted)',
            fontSize: 13, cursor: 'pointer', transition: 'border-color 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayText}</span>
          <ChevronDown size={14} style={{
            position: 'absolute', right: 10, top: '50%',
            transform: `translateY(-50%) rotate(${isOpen ? 180 : 0}deg)`,
            color: 'var(--text-muted)', pointerEvents: 'none', transition: 'transform 0.2s',
          }} />
        </div>
        {dropdownMenu}
      </div>
    </div>
  );
}

export default function FilterBar() {
  const { uiCity, uiDisease, uiGender, uiSeverity, uiTimeRange, setFilter, resetFilters, filtersChanging } = useDashboardFilterStore(
    useShallow((state) => ({
      uiCity: state.uiCity,
      uiDisease: state.uiDisease,
      uiGender: state.uiGender,
      uiSeverity: state.uiSeverity,
      uiTimeRange: state.uiTimeRange,
      setFilter: state.setFilter,
      resetFilters: state.resetFilters,
      filtersChanging: state.filtersChanging,
    }))
  );

  const [cities,   setCities]   = useState([]);
  const [diseases, setDiseases] = useState([]);

  const loadDropdowns = useCallback(async () => {
    try {
      const [cRes, dRes] = await Promise.all([getCityList(), getDiseaseList()]);
      if (cRes?.data) {
        // Deduplicate city names before building options
        const uniqueCities = Array.from(new Map(cRes.data.map(c => [c, c])).values());
        setCities([{ value: '', label: 'All Governorates' }, ...uniqueCities.map(c => ({ value: c, label: c }))]);
      }
      if (dRes?.data) {
        // Deduplicate disease names before building options
        const uniqueDiseases = Array.from(new Map(dRes.data.map(d => [d.name, d])).values());
        setDiseases([{ value: '', label: 'All Diseases' }, ...uniqueDiseases.map(d => ({ value: d.name, label: d.name }))]);
      }
    } catch (_) {}
  }, []);

  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

  const activeFiltersCount = [uiCity, ...(uiDisease || []), uiGender, uiSeverity, uiTimeRange !== '1y' ? uiTimeRange : null].filter(Boolean).length;
  const isDefault = activeFiltersCount === 0;

  return (
    <div style={{
      position: 'relative', zIndex: 999,
      background: 'var(--bg-secondary)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '16px 20px', marginBottom: 24,
      boxShadow: '0 8px 32px rgba(0,0,0,0.1)', backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SlidersHorizontal size={16} style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Dashboard Filters</h3>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Global dataset controls</p>
          </div>
          {activeFiltersCount > 0 && (
            <span style={{ marginLeft: 8, background: '#3b82f6', color: 'white', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12 }}>
              {activeFiltersCount} Active
            </span>
          )}
        </div>
        
        <button
          onClick={resetFilters}
          disabled={isDefault || filtersChanging}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 6, 
            background: isDefault ? 'transparent' : 'rgba(239, 68, 68, 0.1)', 
            border: `1px solid ${isDefault ? 'var(--border)' : 'rgba(239, 68, 68, 0.2)'}`, 
            borderRadius: 8, padding: '6px 14px', 
            color: isDefault ? 'var(--text-muted)' : '#ef4444', 
            fontSize: 12, fontWeight: 600,
            cursor: isDefault ? 'not-allowed' : 'pointer', 
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: filtersChanging ? 0.7 : 1
          }}
          onMouseEnter={(e) => { 
            if (!isDefault && !filtersChanging) {
              e.currentTarget.style.background = '#ef4444'; 
              e.currentTarget.style.color = '#ffffff'; 
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.25)';
            }
          }}
          onMouseLeave={(e) => { 
            if (!isDefault) {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; 
              e.currentTarget.style.color = '#ef4444'; 
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = 'none';
            }
          }}
        >
          <RotateCcw size={14} style={{ animation: filtersChanging ? 'spin 1s linear infinite' : 'none' }} /> 
          {filtersChanging ? 'Applying...' : 'Clear Filters'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FilterSelect label="Governorate" value={uiCity}     onChange={(v) => setFilter('uiCity', v)}      options={cities.length ? cities : [{ value: '', label: 'Loading…' }]} />
        <MultiSelect  label="Disease"     selectedValues={uiDisease}  onChange={(v) => setFilter('uiDisease', v)}   options={diseases.length ? diseases : [{ value: '', label: 'Loading…' }]} />
        <FilterSelect label="Gender"      value={uiGender}   onChange={(v) => setFilter('uiGender', v)}    options={GENDERS} />
        <FilterSelect label="Severity"    value={uiSeverity} onChange={(v) => setFilter('uiSeverity', v)}  options={SEVERITIES} />
        <FilterSelect label="Time Range"  value={uiTimeRange} onChange={(v) => setFilter('uiTimeRange', v)} options={TIME_RANGES} />
      </div>
    </div>
  );
}
