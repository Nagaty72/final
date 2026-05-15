'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/context/AuthContext';
import { getHospitals, getNearbyHospitals, createHospital, updateHospital, deleteHospital } from '@/services/hospital.service';
import { getDistricts } from '@/services/district.service';
import { useGeolocation } from '@/hooks/useGeolocation';
import HospitalCard from '@/components/HospitalCard';
import { useTranslation } from 'react-i18next';

// Dynamically import the map component because Leaflet uses 'window'
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', borderRadius: '12px' }}>
      <div className="pulse-dot" style={{ background: 'var(--accent)', width: 12, height: 12 }} />
    </div>
  )
});

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
  
  // Interactive State
  const [activeHospitalId, setActiveHospitalId] = useState(null);

  // Modal State (for CRUD)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', type: 'Hospital', address: '', city: '', district_id: '',
    phone: '', emergency_available: false, capacity: 0, latitude: '', longitude: ''
  });

  // Extract unique cities for the dropdown
  const cities = useMemo(() => {
    if (!districts.length) return [];
    return [...new Set(districts.map(d => d.city))].sort();
  }, [districts]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchDistricts();
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Refetch data when filters change (unless using geolocation which overrides city filter)
  useEffect(() => {
    if (user?.role === 'super_admin' && !location) {
      fetchData();
    }
  }, [selectedCity, selectedType]);

  // When geolocation changes, fetch nearby hospitals
  useEffect(() => {
    if (location && user?.role === 'super_admin') {
      fetchNearbyData();
    }
  }, [location, selectedType]);

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
      const params = {};
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
      const params = { radius: 20000 }; // 20km radius default
      if (selectedType) params.type = selectedType;
      
      const res = await getNearbyHospitals(location.latitude, location.longitude, params);
      if (Array.isArray(res)) setHospitals(res);
      // Reset city filter visually since nearby overrides it
      if (selectedCity) setSelectedCity('');
    } catch (e) {
      console.error('Failed to fetch nearby hospitals:', e);
    } finally {
      setLoading(false);
    }
  };

  // Client-side search filtering
  const filteredHospitals = useMemo(() => {
    if (!searchTerm) return hospitals;
    const term = searchTerm.toLowerCase();
    return hospitals.filter(h => 
      h.name?.toLowerCase().includes(term) ||
      h.address?.toLowerCase().includes(term) ||
      h.district_name?.toLowerCase().includes(term)
    );
  }, [hospitals, searchTerm]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = filteredHospitals.length;
    const hospitalsCount = filteredHospitals.filter(h => !h.type?.toLowerCase().includes('clinic')).length;
    const clinicsCount = filteredHospitals.filter(h => h.type?.toLowerCase().includes('clinic')).length;
    const emergencyCount = filteredHospitals.filter(h => h.emergency_available).length;
    return { total, hospitalsCount, clinicsCount, emergencyCount };
  }, [filteredHospitals]);

  if (loading && !hospitals.length) {
    return <div className="pulse-dot" style={{ background: 'var(--accent)', width: 12, height: 12, margin: '100px auto' }} />;
  }

  if (user?.role !== 'super_admin') {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px', background: 'var(--bg-secondary)', borderRadius: 16, border: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 32, marginBottom: 16, color: '#ef4444' }}>🚫 {t('hospitals.unauthorized')}</h1>
        <p style={{ color: 'var(--text-muted)' }}>{t('hospitals.no_permission')}<br/>{t('hospitals.super_admin_only')}</p>
      </div>
    );
  }

  // CRUD Handlers
  const handleOpenModal = (hospital = null) => {
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = { ...formData, capacity: Number(formData.capacity) };
      if (formData.latitude && formData.longitude) {
        payload.latitude = Number(formData.latitude);
        payload.longitude = Number(formData.longitude);
      }
      
      if (editingId) {
        await updateHospital(editingId, payload);
      } else {
        await createHospital(payload);
      }
      location ? await fetchNearbyData() : await fetchData();
      handleCloseModal();
    } catch (err) {
      alert('Error saving hospital: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
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
      {/* Header section */}
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
            {geoLoading ? t('hospitals.locating') : `📍 ${t('hospitals.use_my_location')}`}
          </button>
          <button className="auth-btn" onClick={() => handleOpenModal()}>
            + {t('hospitals.add_facility')}
          </button>
        </div>
      </div>
      
      {geoError && <div className="error-banner">{geoError}</div>}

      {/* KPI Stats */}
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

      {/* Main Content Layout */}
      <div className="map-layout">
        
        {/* Left Side: Filters and Cards List */}
        <div className="sidebar-panel">
          <div className="filters-container">
            <input 
              type="text" 
              placeholder={t('hospitals.search_placeholder')} 
              className="input-field search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="filter-row">
              <select 
                className="input-field filter-select"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                disabled={!!location}
              >
                <option value="">{t('hospitals.all_governorates')}</option>
                {cities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
              
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
              <div className="location-active-badge">
                {t('hospitals.showing_nearest')}
                <button onClick={() => window.location.reload()} className="reset-loc">{t('hospitals.reset')}</button>
              </div>
            )}
          </div>

          <div className="cards-scroll-area">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>{t('hospitals.loading')}</div>
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
                  {/* Small edit/delete controls inline for super_admin */}
                  <div className="card-quick-actions">
                    <button onClick={(e) => { e.stopPropagation(); handleOpenModal(hospital); }} className="action-link edit">{t('hospitals.edit')}</button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(hospital.id); }} className="action-link delete">{t('hospitals.delete')}</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Interactive Map */}
        <div className="map-panel">
          <MapComponent 
            hospitals={filteredHospitals}
            userLocation={location}
            activeHospitalId={activeHospitalId}
            onMarkerClick={(id) => setActiveHospitalId(id)}
          />
        </div>
      </div>

      {/* CRUD Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingId ? t('hospitals.edit_facility') : t('hospitals.add_new_facility')}</h2>
            
            <form onSubmit={handleSubmit} className="crud-form">
              <div className="input-group">
                <label>{t('hospitals.facility_name')}</label>
                <input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>{t('hospitals.type')}</label>
                  <select required className="input-field select-dark" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="Hospital">{t('hospitals.hospital')}</option>
                    <option value="Clinic">{t('hospitals.clinic')}</option>
                    <option value="Medical Center">{t('hospitals.medical_center')}</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>{t('hospitals.phone_number')}</label>
                  <input className="input-field" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              
              <div className="input-group">
                <label>{t('hospitals.address')}</label>
                <input className="input-field" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>{t('hospitals.district')}</label>
                  <select required className="input-field select-dark" value={formData.district_id} onChange={e => {
                    const d = districts.find(x => x.id === e.target.value);
                    setFormData({...formData, district_id: e.target.value, city: d ? d.city : ''});
                  }}>
                    <option value="">{t('hospitals.select_district')}</option>
                    {districts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.city})</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>{t('hospitals.capacity_beds')}</label>
                  <input type="number" min="0" className="input-field" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>{t('hospitals.latitude')}</label>
                  <input type="number" step="any" className="input-field" placeholder="e.g. 30.0444" value={formData.latitude} onChange={e => setFormData({...formData, latitude: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>{t('hospitals.longitude')}</label>
                  <input type="number" step="any" className="input-field" placeholder="e.g. 31.2357" value={formData.longitude} onChange={e => setFormData({...formData, longitude: e.target.value})} />
                </div>
              </div>

              <div className="checkbox-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', color: '#f8fafc' }}>
                  <input type="checkbox" checked={formData.emergency_available} onChange={e => setFormData({...formData, emergency_available: e.target.checked})} style={{ width: 18, height: 18 }} />
                  24/7 {t('hospitals.emergency_services')}
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={handleCloseModal} className="btn-cancel">{t('hospitals.cancel')}</button>
                <button type="submit" disabled={isSaving} className="auth-btn btn-save">
                  {isSaving ? t('hospitals.saving') : (editingId ? t('hospitals.update') : t('hospitals.create'))}
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
          height: calc(100vh - 40px); /* Adjust based on AppShell padding */
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
          fontSize: 14px;
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
          min-height: 0; /* Important for scrollable children */
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
          color: white; 
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
        /* Custom scrollbar for cards area */
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
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
          display: flex; alignItems: center; justifyContent: center; z-index: 9999;
        }
        .modal-content {
          background: var(--bg-secondary); padding: 32px; border-radius: 16px;
          width: 100%; maxWidth: 600px; border: 1px solid var(--border);
          max-height: 90vh; overflow-y: auto;
        }
        .crud-form { display: flex; flex-direction: column; gap: 16px; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .select-dark { background: var(--bg-primary); color: white; }
        .modal-actions { display: flex; gap: 12px; margin-top: 20px; }
        .btn-cancel {
          flex: 1; padding: 12px; border-radius: 8px;
          background: transparent; border: 1px solid var(--border);
          color: white; cursor: pointer;
        }
        .btn-save { flex: 1; border-radius: 8px; padding: 12px; }
        
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
