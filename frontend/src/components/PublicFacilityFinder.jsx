import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

import dynamic from 'next/dynamic';
import { getPublicHospitals, getPublicNearbyHospitals, getPublicCities } from '@/services/hospital.service';
import { useGeolocation } from '@/hooks/useGeolocation';
import HospitalCard from '@/components/HospitalCard';
import { useTranslation } from 'react-i18next';
import { MapPin, Loader2, ChevronDown, AlertCircle } from 'lucide-react';

const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', borderRadius: '12px' }}>
      <Loader2 className="animate-spin" style={{ color: 'var(--accent)' }} size={32} />
    </div>
  )
});

function GovernorateDropdown({ value, onChange, options, disabled, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const openDropdown = useCallback(() => {
    if (disabled) return;
    setIsOpen(true);
  }, [disabled]);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(o => o.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  console.log('[DROPDOWN_OPEN]', isOpen);
  console.log('[DROPDOWN_OPTIONS]', options.length);

  const dropdownEl = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 4px)',
        left: 0,
        right: 0,
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
      <div
        onClick={() => {
          onChange('');
          setIsOpen(false);
        }}
        style={{
          padding: '8px 12px',
          fontSize: 13,
          cursor: 'pointer',
          background: value === '' ? 'rgba(59,130,246,0.1)' : 'transparent',
          color: value === '' ? 'var(--accent)' : 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (value !== '') e.currentTarget.style.background = 'var(--bg-primary)'; }}
        onMouseLeave={e => { if (value !== '') e.currentTarget.style.background = 'transparent'; }}
      >
        {placeholder}
      </div>
      {options.map(o => {
        const isSel = o.value === value;
        return (
          <div
            key={o.value}
            onClick={() => {
              onChange(o.value);
              setIsOpen(false);
            }}
            style={{
              padding: '8px 12px',
              fontSize: 13,
              cursor: 'pointer',
              background: isSel ? 'rgba(59,130,246,0.1)' : 'transparent',
              color: isSel ? 'var(--accent)' : 'var(--text-secondary)',
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
    <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
      <div
        ref={triggerRef}
        onClick={() => {
          if (disabled) return;
          if (isOpen) setIsOpen(false);
          else openDropdown();
        }}
        style={{
          width: '100%',
          padding: '10px 14px',
          background: 'var(--bg-primary)',
          border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border)'}`,
          borderRadius: 8,
          fontSize: 13,
          cursor: disabled ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          opacity: disabled ? 0.5 : 1,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'start' }}>
          {displayText}
        </span>
        <ChevronDown size={14} style={{
          marginLeft: 8,
          marginRight: 8,
          color: 'var(--text-muted)',
          transition: 'transform 0.2s',
          transform: `rotate(${isOpen ? 180 : 0}deg)`,
          flexShrink: 0
        }} />
      </div>
      {dropdownEl}
    </div>
  );
}

export default function PublicFacilityFinder() {
  const { t } = useTranslation();
  const { location, error: geoError, loading: geoLoading, requestLocation } = useGeolocation();
  
  const [hospitals, setHospitals] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  
  console.log('[CITIES_STATE]', cities);
  console.log('[CITIES_LENGTH]', cities.length);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [searchRadius, setSearchRadius] = useState(20000); // 20km
  
  // Interactive State
  const [activeHospitalId, setActiveHospitalId] = useState(null);

  useEffect(() => {
    console.log("[TRACE] Dropdown selectedCity changed:", selectedCity);
  }, [selectedCity]);

  const fetchData = async () => {
    setLoading(true);
    console.log("[TRACE] fetchData() triggered with selectedCity:", selectedCity);
    try {
      const params = { limit: 1000 };
      if (selectedCity) params.city = selectedCity;
      if (selectedType) params.type = selectedType;
      
      console.log("[TRACE] fetchData() params object:", params);
      const res = await getPublicHospitals(params);
      if (Array.isArray(res)) {
        console.log(`[TRACE] fetchData() received ${res.length} hospitals`);
        setHospitals(res);
      }
    } catch (e) {
      console.error('Failed to fetch public hospitals:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyData = async (coords = location) => {
    if (!coords) return;
    console.log("[TRACE] fetchNearbyData() coords:", coords);
    setLoading(true);
    try {
      const params = { radius: searchRadius, limit: 100 };
      if (selectedType) params.type = selectedType;
      
      console.log("[TRACE] fetchNearbyData() params:", params);
      const res = await getPublicNearbyHospitals(coords.latitude, coords.longitude, params);
      if (Array.isArray(res)) {
        console.log(`[TRACE] fetchNearbyData() received ${res.length} hospitals.`);
        res.forEach(h => console.log(`[NEARBY_API_RESULT] ${h.name} | City: ${h.city} | Dist: ${h.distance} | Lat: ${h.latitude} | Lng: ${h.longitude}`));
        setHospitals(res);
      }
      if (selectedCity) {
        console.log("[TRACE] Resetting selectedCity because location is active.");
        setSelectedCity('');
      }
    } catch (e) {
      console.error('Failed to fetch nearby public hospitals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAllCities = async () => {
      try {
        const res = await getPublicCities();
        console.log('[TRACE] cities response from getPublicCities:', res);
        if (res && Array.isArray(res.data)) setCities(res.data.sort());
        else if (Array.isArray(res)) setCities(res.sort());
        else console.log('[TRACE] res is not an array, skipping setCities');
      } catch (e) {
        console.error('Failed to fetch public cities:', e);
      }
    };
    fetchAllCities();
  }, []);

  useEffect(() => {
    if (!location) {
      fetchData();
    }
  }, [selectedCity, selectedType, location]);

  useEffect(() => {
    // Only re-fetch on type/radius change if we already have location
    if (location) {
      fetchNearbyData(location);
    }
  }, [selectedType, searchRadius]); // Removed location to prevent double fetch race conditions

  const filteredHospitals = useMemo(() => {
    let result = hospitals;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(h => 
        h.name?.toLowerCase().includes(term) ||
        h.address?.toLowerCase().includes(term) ||
        h.district_name?.toLowerCase().includes(term)
      );
    }
    // Strictly sort by distance ascending
    result = result.sort((a, b) => {
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });

    console.log("LIST RENDER COUNT:", result.length);
    console.log("MAP RENDER COUNT:", result.filter(h => h.latitude && h.longitude).length);
    console.log("LIST IDs:", result.map(h => h.id));
    console.log("MAP IDs:", result.filter(h => h.latitude && h.longitude).map(h => h.id));

    return result;
  }, [hospitals, searchTerm]);

  return (
    <div className="public-facility-finder bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden flex flex-col z-20 h-full w-full relative">
      
      {/* Header */}
      <div className="h-[60px] bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between px-5 sm:px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <MapPin size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-tight">{t('hospitals.title') || 'Nearby Facilities'}</h3>
            <div className="text-[11px] text-slate-500 font-semibold mt-0.5">Find nearest healthcare centers without logging in</div>
          </div>
        </div>
        
        <button 
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[13px] font-bold transition-all border ${location ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`} 
          onClick={() => requestLocation((coords) => fetchNearbyData(coords))}
          disabled={geoLoading}
        >
          {geoLoading ? <Loader2 className="animate-spin" size={15} /> : <MapPin size={15} />}
          {geoLoading ? 'Locating...' : 'Use My Location'}
        </button>
      </div>

      {geoError && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 text-xs flex items-center gap-2 border-b border-red-100 dark:border-red-900/30 font-medium">
          <AlertCircle size={14} /> {geoError}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-[500px] lg:h-[600px]">
        
        {/* Sidebar / Filters & List */}
        <div className="w-full lg:w-[35%] lg:min-w-[400px] flex flex-col bg-slate-50/50 dark:bg-slate-900/30 border-r border-slate-200 dark:border-slate-700/60 flex-shrink-0 z-10">
          
          <div className="p-5 border-b border-slate-200 dark:border-slate-700/60 flex flex-col gap-3">
            <input 
              type="text" 
              placeholder="Search by name or address..." 
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[15px] text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            
            <div className="flex gap-3">
              <div className="flex-1 min-w-0">
                <div style={{ height: '42px' }}>
                  <GovernorateDropdown
                    value={selectedCity}
                    onChange={setSelectedCity}
                    options={(() => {
                      const opts = cities.map(city => ({ value: city, label: city }));
                      console.log('[TRACE] Dropdown options count:', opts.length, 'cities state:', cities);
                      return opts;
                    })()}
                    disabled={!!location}
                    placeholder="All Cities"
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <select 
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[15px] text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-blue-500 appearance-none h-[42px]"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Hospital">Hospital</option>
                  <option value="Clinic">Clinic</option>
                  <option value="Medical Center">Medical Center</option>
                </select>
              </div>
            </div>

            {location && (
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 px-3.5 py-2.5 rounded-lg border border-blue-100 dark:border-blue-800">
                <span className="text-[13px] text-blue-700 dark:text-blue-300 font-bold">Search Radius</span>
                <select
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-md text-[13px] font-semibold text-blue-700 dark:text-blue-300 outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                >
                  <option value={5000}>5 km</option>
                  <option value={10000}>10 km</option>
                  <option value={20000}>20 km</option>
                  <option value={50000}>50 km</option>
                </select>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 custom-scrollbar relative">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-sm font-medium">Searching facilities...</span>
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="text-center p-8 text-slate-500 text-sm font-medium border border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                No facilities found matching your criteria.
              </div>
            ) : (
              filteredHospitals.map(hospital => (
                <HospitalCard 
                  key={hospital.id}
                  hospital={hospital}
                  isActive={activeHospitalId === hospital.id}
                  onClick={() => setActiveHospitalId(hospital.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Map Panel */}
        <div className="flex-1 relative min-h-[300px]">
          <MapComponent 
            hospitals={filteredHospitals}
            userLocation={location}
            activeHospitalId={activeHospitalId}
            onMarkerClick={(id) => setActiveHospitalId(id)}
          />
        </div>

      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
      `}</style>
    </div>
  );
}
