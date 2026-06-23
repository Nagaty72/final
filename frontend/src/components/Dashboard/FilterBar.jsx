'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDashboardFilterStore } from '@/store/dashboardFilterStore';
import { useShallow } from 'zustand/react/shallow';
import { getDiseaseList, getCityList } from '@/services/analytics.service';
import { getReportFilterOptions } from '@/services/report.service';
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

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'Under Treatment', label: 'Active' },
  { value: 'Recovered', label: 'Recovered' },
  { value: 'Deceased', label: 'Deceased' }
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

  const selectedLabels = selectedValues.map(val => {
    const opt = options.find(o => String(o.value) === String(val));
    return opt ? opt.label : val;
  });

  const displayText = selectedValues.length === 0
    ? 'All Diseases'
    : selectedLabels.join(', ');

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
            onClick={() => {
              console.log('[DISEASE_SELECTED]', o.value);
              o.value ? toggleValue(o.value) : onChange([]);
            }}
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
  const { uiCity, uiDisease, uiGender, uiSeverity, uiStatus, uiHospital, uiTimeRange, setFilter, resetFilters, filtersChanging } = useDashboardFilterStore(
    useShallow((state) => ({
      uiCity: state.uiCity,
      uiDisease: state.uiDisease,
      uiGender: state.uiGender,
      uiSeverity: state.uiSeverity,
      uiStatus: state.uiStatus,
      uiHospital: state.uiHospital,
      uiTimeRange: state.uiTimeRange,
      setFilter: state.setFilter,
      resetFilters: state.resetFilters,
      filtersChanging: state.filtersChanging,
    }))
  );

  const [cities,   setCities]   = useState([]);
  const [diseases, setDiseases] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(true);

  const loadDropdowns = useCallback(async () => {
    try {
      const [cRes, dRes, fRes] = await Promise.all([
        getCityList().catch(() => null),
        getDiseaseList().catch(() => null),
        getReportFilterOptions().catch(() => null)
      ]);
      
      if (cRes?.data) {
        const uniqueCities = Array.from(new Map(cRes.data.map(c => [c, c])).values());
        setCities([{ value: '', label: 'All Governorates' }, ...uniqueCities.map(c => ({ value: c, label: c }))]);
      }
      
      if (dRes?.data) {
        const uniqueDiseases = Array.from(new Map(dRes.data.map(d => [d.id, d])).values());
        const diseaseOptions = [{ value: '', label: 'All Diseases' }, ...uniqueDiseases.map(d => ({ value: d.id, label: d.name }))];
        console.log('[DISEASE_OPTIONS]', diseaseOptions);
        setDiseases(diseaseOptions);
      }
      
      if (fRes?.data?.hospitals) {
        const rawHospitals = fRes.data.hospitals || [];
        const uniqueHospitals = Array.from(new Map(rawHospitals.map(h => [h.id, h])).values());
        setHospitals([{ value: '', label: 'All Hospitals' }, ...uniqueHospitals.map(h => ({ value: h.id, label: h.name }))]);
      }
    } catch (_) {
      // Ignored
    } finally {
      setHospitalsLoading(false);
    }
  }, []);

  useEffect(() => { loadDropdowns(); }, [loadDropdowns]);

  const activeFiltersCount = [uiCity, uiDisease, uiGender, uiSeverity, uiStatus, uiHospital, uiTimeRange !== '6m' ? uiTimeRange : null].filter(Boolean).length;
  const isDefault = activeFiltersCount === 0;

  return (
    <div style={{
      position: 'relative', zIndex: 999,
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      padding: '14px 20px',
      boxShadow: 'var(--shadow-xs)',
      backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'var(--accent-light)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SlidersHorizontal size={14} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Filters</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>Global dataset controls</span>
          </div>
          {activeFiltersCount > 0 && (
            <span style={{
              marginLeft: 4,
              background: 'var(--accent)', color: 'white',
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
            }}>
              {activeFiltersCount}
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

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FilterSelect label="Governorate" value={uiCity}     onChange={(v) => setFilter('uiCity', v)}      options={cities.length ? cities : [{ value: '', label: 'Loading…' }]} />
        <FilterSelect label="Disease"     value={uiDisease}  onChange={(v) => { console.log('[STORE_BEFORE_UPDATE]', v); setFilter('uiDisease', v); }}   options={diseases.length ? diseases : [{ value: '', label: 'Loading…' }]} />
        <FilterSelect label="Gender"      value={uiGender}   onChange={(v) => setFilter('uiGender', v)}    options={GENDERS} />
        <FilterSelect label="Severity"    value={uiSeverity} onChange={(v) => setFilter('uiSeverity', v)}  options={SEVERITIES} />
        <FilterSelect label="Status"      value={uiStatus}   onChange={(v) => { console.log("Selected Status", v); setFilter('uiStatus', v); }}    options={STATUSES} />
        <FilterSelect label="Hospital"    value={uiHospital} onChange={(v) => { console.log("Selected Hospital", v); setFilter('uiHospital', v); }}  
          options={hospitalsLoading ? [{ value: '', label: 'Loading…' }] : (hospitals.length ? hospitals : [{ value: '', label: 'No hospitals found' }])} />
        <FilterSelect label="Time Range"  value={uiTimeRange} onChange={(v) => setFilter('uiTimeRange', v)} options={TIME_RANGES} />
      </div>
    </div>
  );
}
