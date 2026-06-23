'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { getHospitals, getNearbyHospitals, createHospital, updateHospital, deleteHospital } from '@/services/hospital.service';
import { getDistricts } from '@/services/district.service';
import { getCityList } from '@/services/analytics.service';
import { useGeolocation } from '@/hooks/useGeolocation';
import HospitalCard from '@/components/HospitalCard';
import { useTranslation } from 'react-i18next';
import { X, Building2, MapPin, Phone, Settings2, ShieldAlert, CheckCircle2, AlertCircle, Loader2, ChevronDown } from 'lucide-react';

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
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const openDropdown = useCallback(() => {
    if (disabled) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
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

  const dropdownEl = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: coords.top,
        left: coords.left,
        width: coords.width,
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
    </div>,
    document.body
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

export default function HospitalsPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { location, error: geoError, loading: geoLoading, requestLocation } = useGeolocation();
  
  const [hospitals, setHospitals] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [requireBeds, setRequireBeds] = useState(false);
  
  // Interactive State
  const [activeHospitalId, setActiveHospitalId] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [formSuccess, setFormSuccess] = useState(null);
  const [formData, setFormData] = useState({
    name: '', type: 'Hospital', address: '', city: '', district_id: '',
    phone: '', emergency_available: false, capacity: 0, latitude: '', longitude: ''
  });

  const [cities, setCities] = useState([]);

  const fetchDistricts = async () => {
    try {
      const dRes = await getDistricts();
      if (Array.isArray(dRes)) setDistricts(dRes);
    } catch (e) {
      console.error('Failed to fetch districts:', e);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { limit: 1000 };
      if (selectedCity) params.city = selectedCity;
      if (selectedType) params.type = selectedType;
      
      const res = await getHospitals(params);
      if (Array.isArray(res)) setHospitals(res);
    } catch (e) {
      console.error('Failed to fetch hospitals:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyData = async () => {
    setLoading(true);
    try {
      const params = { radius: 20000, limit: 1000 };
      if (selectedType) params.type = selectedType;
      if (requireBeds) params.requireBeds = true;
      
      const res = await getNearbyHospitals(location.latitude, location.longitude, params);
      if (Array.isArray(res)) setHospitals(res);
      if (selectedCity) setSelectedCity('');
    } catch (e) {
      console.error('Failed to fetch nearby hospitals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchAllCities = async () => {
      try {
        const cRes = await getCityList();
        if (cRes?.data) setCities(cRes.data.sort());
      } catch (e) {
        console.error('Failed to fetch cities:', e);
      }
    };
    fetchAllCities();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDistricts();
      fetchData();
    }
  }, [user]);

  useEffect(() => {
    if (user && !location) {
      fetchData();
    }
  }, [selectedCity, selectedType, location, user]);

  useEffect(() => {
    if (location && user) {
      fetchNearbyData();
    }
  }, [location, selectedType, requireBeds, user]);

  const filteredHospitals = useMemo(() => {
    if (!searchTerm) return hospitals;
    const term = searchTerm.toLowerCase();
    return hospitals.filter(h => 
      h.name?.toLowerCase().includes(term) ||
      h.address?.toLowerCase().includes(term) ||
      h.district_name?.toLowerCase().includes(term)
    );
  }, [hospitals, searchTerm]);

  const stats = useMemo(() => {
    const total = filteredHospitals.length;
    const hospitalsCount = filteredHospitals.filter(h => !h.type?.toLowerCase().includes('clinic')).length;
    const clinicsCount = filteredHospitals.filter(h => h.type?.toLowerCase().includes('clinic')).length;
    const emergencyCount = filteredHospitals.filter(h => h.emergency_available).length;
    return { total, hospitalsCount, clinicsCount, emergencyCount };
  }, [filteredHospitals]);

  if (loading && !hospitals.length) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }


  const handleOpenModal = (hospital = null) => {
    setFormError(null);
    setFormSuccess(null);
    if (hospital) {
      setEditingId(hospital.id);
      setFormData({
        name: hospital.name || '', type: hospital.type || 'Hospital',
        address: hospital.address || '', city: hospital.city || '',
        district_id: hospital.district_id || '', phone: hospital.phone || '',
        emergency_available: !!hospital.emergency_available,
        capacity: hospital.capacity || 0,
        latitude: hospital.latitude || '', longitude: hospital.longitude || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        name: '', type: 'Hospital', address: '', city: '', district_id: '',
        phone: '', emergency_available: false, capacity: 0, latitude: '', longitude: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user?.role !== 'super_admin') return;
    if (isSaving) return; // Prevent duplicate submissions

    setIsSaving(true);
    setFormError(null);
    setFormSuccess(null);

    try {
      const payload = { ...formData, capacity: Number(formData.capacity) };
      if (formData.latitude && formData.longitude) {
        payload.latitude = Number(formData.latitude);
        payload.longitude = Number(formData.longitude);
      }
      
      if (editingId) {
        await updateHospital(editingId, payload);
        setFormSuccess(t('hospitals.update_success', 'Facility updated successfully.'));
      } else {
        await createHospital(payload);
        setFormSuccess(t('hospitals.create_success', 'Facility created successfully.'));
      }
      
      location ? await fetchNearbyData() : await fetchData();
      
      setTimeout(() => {
        handleCloseModal();
      }, 1000); // Small delay to show success state before closing

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'An error occurred';
      setFormError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (user?.role !== 'super_admin') return;
    if (window.confirm(t('hospitals.confirm_delete'))) {
      try {
        await deleteHospital(id);
        location ? await fetchNearbyData() : await fetchData();
      } catch (err) {
        alert('Error deleting hospital: ' + err.message);
      }
    }
  };

  return (
    <div className="gis-container">
      <div className="header-section">
        <div>
          <h1 className="page-title">{t('hospitals.title')}</h1>
          <p className="page-subtitle">{t('hospitals.subtitle')}</p>
        </div>
        <div className="header-actions">
          <button 
            className={`auth-btn location-btn ${location ? 'active' : ''}`} 
            onClick={requestLocation}
            disabled={geoLoading}
          >
            {geoLoading ? <Loader2 className="animate-spin" size={16} /> : <MapPin size={16} />}
            {geoLoading ? t('hospitals.locating') : t('hospitals.use_my_location')}
          </button>
          {user?.role === 'super_admin' && (
            <button className="auth-btn" onClick={() => handleOpenModal()}>
              + {t('hospitals.add_facility')}
            </button>
          )}
        </div>
      </div>
      
      {geoError && <div className="error-banner"><AlertCircle size={18} /> {geoError}</div>}

      <div className="kpi-grid">
        <div className="kpi-card blue">
          <div className="kpi-label">{t('hospitals.total_facilities')}</div>
          <div className="kpi-value">{stats.total}</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">{t('hospitals.hospitals_label')}</div>
          <div className="kpi-value">{stats.hospitalsCount}</div>
        </div>
        <div className="kpi-card amber">
          <div className="kpi-label">{t('hospitals.clinics_centers')}</div>
          <div className="kpi-value">{stats.clinicsCount}</div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">{t('hospitals.emergency_247')}</div>
          <div className="kpi-value">{stats.emergencyCount}</div>
        </div>
      </div>

      <div className="map-layout">
        <div className="sidebar-panel">
          <div className="filters-container">
            <div className="search-wrapper">
              <input 
                type="text" 
                placeholder={t('hospitals.search_placeholder')} 
                className="input-field search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-row">
              <GovernorateDropdown
                value={selectedCity}
                onChange={setSelectedCity}
                options={cities.map(city => ({ value: city, label: city }))}
                disabled={!!location}
                placeholder={t('hospitals.all_governorates')}
              />
              
              <select 
                className="input-field filter-select"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
              >
                <option value="">{t('hospitals.all_types')}</option>
                <option value="Hospital">{t('hospitals.hospital')}</option>
                <option value="Clinic">{t('hospitals.clinic')}</option>
                <option value="Medical Center">{t('hospitals.medical_center')}</option>
              </select>
            </div>
            {location && (
              <div className="filter-row" style={{ marginTop: '8px' }}>
                <label className="custom-checkbox" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <input type="checkbox" checked={requireBeds} onChange={(e) => setRequireBeds(e.target.checked)} />
                  <span className="checkmark"></span>
                  Must have available beds
                </label>
              </div>
            )}
            {location && (
              <div className="location-active-badge">
                {t('hospitals.showing_nearest')}
                <button onClick={() => window.location.reload()} className="reset-loc">{t('hospitals.reset')}</button>
              </div>
            )}
          </div>

          <div className="cards-scroll-area">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                {t('hospitals.loading')}
              </div>
            ) : filteredHospitals.length === 0 ? (
              <div className="empty-state">{t('hospitals.no_facilities')}</div>
            ) : (
              filteredHospitals.map(hospital => (
                <div key={hospital.id} className="card-wrapper">
                  <HospitalCard 
                    hospital={hospital}
                    isActive={activeHospitalId === hospital.id}
                    onClick={() => setActiveHospitalId(hospital.id)}
                  />
                  {user?.role === 'super_admin' && (
                    <div className="card-quick-actions">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenModal(hospital); }} className="action-link edit">{t('hospitals.edit')}</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(hospital.id); }} className="action-link delete">{t('hospitals.delete')}</button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="map-panel">
          <MapComponent 
            hospitals={filteredHospitals}
            userLocation={location}
            activeHospitalId={activeHospitalId}
            onMarkerClick={(id) => setActiveHospitalId(id)}
          />
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-effect">
            <div className="modal-header">
              <h2>{editingId ? t('hospitals.edit_facility') : t('hospitals.add_new_facility')}</h2>
              <button onClick={handleCloseModal} className="close-btn"><X size={24} /></button>
            </div>
            
            {formError && (
              <div className="modal-alert error">
                <AlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="modal-alert success">
                <CheckCircle2 size={18} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="crud-form">
              <div className="form-section">
                <h3 className="section-title"><Building2 size={16} /> Basic Information</h3>
                <div className="input-group">
                  <label>{t('hospitals.facility_name')} *</label>
                  <input required className="input-field modern" placeholder="e.g. City General Hospital" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label>{t('hospitals.type')} *</label>
                    <select required className="input-field modern" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option value="Hospital">{t('hospitals.hospital')}</option>
                      <option value="Clinic">{t('hospitals.clinic')}</option>
                      <option value="Medical Center">{t('hospitals.medical_center')}</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>{t('hospitals.phone_number')}</label>
                    <div className="input-icon-wrapper">
                      <Phone size={16} className="input-icon" />
                      <input className="input-field modern pl-10" placeholder="e.g. +20100000000" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="form-section">
                <h3 className="section-title"><MapPin size={16} /> Location Details</h3>
                <div className="input-group">
                  <label>{t('hospitals.address')} *</label>
                  <input required className="input-field modern" placeholder="123 Health Street" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                </div>

                <div className="input-group">
                  <label>{t('hospitals.district')} *</label>
                  <select required className="input-field modern" value={formData.district_id} onChange={e => {
                    const d = districts.find(x => x.id === e.target.value);
                    setFormData({...formData, district_id: e.target.value, city: d ? d.city : ''});
                  }}>
                    <option value="">{t('hospitals.select_district')}</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.city})</option>)}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="input-group">
                    <label>{t('hospitals.latitude')} (Optional)</label>
                    <input type="number" step="any" className="input-field modern" placeholder="e.g. 30.0444" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
                  </div>
                  <div className="input-group">
                    <label>{t('hospitals.longitude')} (Optional)</label>
                    <input type="number" step="any" className="input-field modern" placeholder="e.g. 31.2357" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title"><Settings2 size={16} /> Operations</h3>
                <div className="grid-2">
                  <div className="input-group">
                    <label>{t('hospitals.capacity_beds')}</label>
                    <input type="number" min="0" className="input-field modern" placeholder="0" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
                  </div>
                  <div className="checkbox-wrapper">
                    <label className="custom-checkbox">
                      <input type="checkbox" checked={formData.emergency_available} onChange={e => setFormData({...formData, emergency_available: e.target.checked})} />
                      <span className="checkmark"></span>
                      <ShieldAlert size={16} style={{ color: formData.emergency_available ? '#ef4444' : 'var(--text-muted)', marginLeft: '8px' }} />
                      24/7 {t('hospitals.emergency_services')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="btn-cancel" disabled={isSaving}>{t('hospitals.cancel')}</button>
                <button type="submit" disabled={isSaving} className="auth-btn btn-save">
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : (editingId ? t('hospitals.update') : t('hospitals.create'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .gis-container {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 40px);
          overflow: hidden;
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-shrink: 0;
        }
        .page-title {
          font-size: 26px;
          font-weight: 700;
          margin: 0 0 4px;
        }
        .page-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0;
        }
        .header-actions {
          display: flex;
          gap: 12px;
        }
        .location-btn {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          border: 1px solid rgba(59, 130, 246, 0.3);
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .location-btn:hover {
          background: rgba(59, 130, 246, 0.2);
        }
        .location-btn.active {
          background: #3b82f6;
          color: white;
        }
        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
          border: 1px solid rgba(239, 68, 68, 0.2);
          font-size: 14px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
          flex-shrink: 0;
        }
        .kpi-label {
          font-size: 13px;
          color: var(--text-muted);
          margin-bottom: 8px;
        }
        .kpi-value {
          font-size: 28px;
          font-weight: 700;
        }
        .kpi-card.red { border-left: 4px solid #ef4444; }
        
        .map-layout {
          display: flex;
          gap: 20px;
          flex: 1;
          min-height: 0;
        }
        .sidebar-panel {
          width: 380px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }
        .filters-container {
          padding: 16px;
          border-bottom: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex-shrink: 0;
        }
        .filter-row {
          display: flex;
          gap: 8px;
        }
        .search-input { width: 100%; }
        .filter-select { 
          flex: 1; 
          background: var(--bg-primary); 
          color: var(--text-primary); 
        }
        .filter-select:disabled { opacity: 0.5; cursor: not-allowed; }
        .location-active-badge {
          background: rgba(16, 185, 129, 0.15);
          color: #10b981;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .reset-loc {
          background: none;
          border: none;
          color: white;
          text-decoration: underline;
          cursor: pointer;
          font-size: 11px;
        }
        .cards-scroll-area {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cards-scroll-area::-webkit-scrollbar { width: 6px; }
        .cards-scroll-area::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
        .cards-scroll-area::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .cards-scroll-area::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
        
        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: #64748b;
          font-size: 14px;
        }
        .card-wrapper {
          position: relative;
        }
        .card-quick-actions {
          position: absolute;
          top: 16px;
          right: 16px;
          display: flex;
          gap: 8px;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .card-wrapper:hover .card-quick-actions {
          opacity: 1;
        }
        .action-link {
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid var(--border);
          color: #94a3b8;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
        }
        .action-link.edit:hover { color: #3b82f6; border-color: #3b82f6; }
        .action-link.delete:hover { color: #ef4444; border-color: #ef4444; }

        .map-panel {
          flex: 1;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid var(--border);
          position: relative;
        }
        
        /* Redesigned Modal Styles */
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(6px);
          display: flex; justify-content: center; align-items: center; z-index: 9999;
          padding: 20px;
        }
        .modal-content.glass-effect {
          background: var(--bg-primary);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          border-radius: 20px;
          width: 100%;
          max-width: 650px;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
        }
        .modal-header {
          position: sticky; top: 0; z-index: 10;
          background: var(--bg-primary); padding: 24px 32px;
          border-bottom: 1px solid var(--border);
          display: flex; justify-content: space-between; align-items: center;
        }
        .modal-header h2 { font-size: 20px; font-weight: 600; margin: 0; color: var(--accent); }
        .close-btn {
          background: transparent; border: none; color: var(--accent); cursor: pointer;
          transition: color 0.2s; padding: 4px; border-radius: 6px;
        }
        .close-btn:hover { color: var(--accent-hover); background: var(--accent-light); }
        
        .modal-alert {
          margin: 20px 32px 0; padding: 12px 16px; border-radius: 8px;
          display: flex; align-items: center; gap: 10px; font-size: 14px; font-weight: 500;
        }
        .modal-alert.error { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
        .modal-alert.success { background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2); }

        .crud-form { padding: 0 32px 32px; display: flex; flex-direction: column; gap: 24px; margin-top: 24px; }
        .form-section { display: flex; flex-direction: column; gap: 16px; }
        .section-title { 
          font-size: 14px; font-weight: 600; color: var(--accent); 
          text-transform: uppercase; letter-spacing: 0.5px;
          display: flex; align-items: center; gap: 8px; margin: 0 0 8px;
          padding-bottom: 8px; border-bottom: 1px solid var(--border);
        }
        
        .input-group label { display: block; font-size: 13px; color: var(--accent); margin-bottom: 6px; font-weight: 500; }
        .input-field.modern {
          width: 100%; background: var(--bg-secondary); border: 1px solid var(--border);
          border-radius: 8px; padding: 10px 14px; color: var(--text-primary); transition: all 0.2s;
        }
        .input-field.modern::placeholder { color: var(--accent); opacity: 0.7; }
        .input-field.modern:focus { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2); outline: none; }
        .input-icon-wrapper { position: relative; }
        .input-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--accent); }
        .pl-10 { padding-left: 36px !important; }
        
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        
        .checkbox-wrapper { display: flex; align-items: flex-end; padding-bottom: 10px; }
        .custom-checkbox {
          display: flex; align-items: center; cursor: pointer; font-size: 14px; color: var(--accent);
          user-select: none; position: relative; padding-left: 28px;
        }
        .custom-checkbox input { position: absolute; opacity: 0; cursor: pointer; height: 0; width: 0; }
        .checkmark {
          position: absolute; top: 0; left: 0; height: 18px; width: 18px;
          background-color: var(--bg-secondary); border: 1px solid var(--border); border-radius: 4px;
        }
        .custom-checkbox:hover input ~ .checkmark { background-color: rgba(255,255,255,0.1); }
        .custom-checkbox input:checked ~ .checkmark { background-color: #ef4444; border-color: #ef4444; }
        .checkmark:after {
          content: ""; position: absolute; display: none;
          left: 5px; top: 2px; width: 4px; height: 8px;
          border: solid white; border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .custom-checkbox input:checked ~ .checkmark:after { display: block; }

        .modal-actions { display: flex; gap: 12px; margin-top: 8px; padding-top: 24px; border-top: 1px solid var(--border); }
        .btn-cancel {
          flex: 1; padding: 12px; border-radius: 8px;
          background: var(--bg-secondary); border: 1px solid var(--border);
          color: var(--accent); cursor: pointer; font-weight: 500; transition: all 0.2s;
        }
        .btn-cancel:hover:not(:disabled) { background: var(--bg-card-hover); color: var(--accent-hover); }
        .btn-cancel:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-save { flex: 2; border-radius: 8px; padding: 12px; display: flex; justify-content: center; align-items: center; gap: 8px; }
        
        @media (max-width: 1024px) {
          .map-layout { flex-direction: column-reverse; }
          .sidebar-panel { width: 100%; height: 400px; flex: none; }
          .map-panel { min-height: 400px; flex: none; }
          .gis-container { height: auto; overflow: visible; }
        }
      `}</style>
    </div>
  );
}
